import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react'
import { useAuth } from '../context/AuthContext'
import { connectChatSocket, disconnectChatSocket } from '../socket/chatSocket'
import { deleteMessage, getMessages, getUserConversations, markConversationAsRead } from '../api/chatApi'
import type { ChatMessage, Conversation, MessageSummary } from '../types'

const formatTime = (iso?: string) => {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getSenderId = (senderId: ChatMessage['senderId']) => (typeof senderId === 'string' ? senderId : senderId._id)

const getParticipantLabel = (conversation: Conversation, currentUserId?: string) => {
  if (!currentUserId) return 'Conversation'
  const other = conversation.participants.find((p) => p._id !== currentUserId)
  return other?.username ?? 'Conversation'
}

const getParticipantAvatar = (conversation: Conversation, currentUserId?: string) => {
  if (!currentUserId) return null
  const other = conversation.participants.find((p) => p._id !== currentUserId)
  return other?.profilePictureUrl ?? null
}

const getLastMessageSummary = (conversation: Conversation): MessageSummary | null => {
  if (typeof conversation.lastMessageId === 'string') return null
  return conversation.lastMessageId ?? null
}

function Chat() {
  const { user, token } = useAuth()
  const [searchParams] = useSearchParams()
  const conversationIdFromUrl = searchParams.get('conversationId')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationIdFromUrl)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; username: string }>>([])
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  const activeConversationRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(user?.userId ?? null)
  const typingTimeout = useRef<number | null>(null)
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const [isPageVisible, setIsPageVisible] = useState(true)

  useEffect(() => {
    activeConversationRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    userIdRef.current = user?.userId ?? null
  }, [user?.userId])

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    if (!messageInputRef.current) return
    const maxHeight = 160
    messageInputRef.current.style.height = 'auto'
    const nextHeight = Math.min(messageInputRef.current.scrollHeight, maxHeight)
    messageInputRef.current.style.height = `${nextHeight}px`
    messageInputRef.current.style.overflowY = messageInputRef.current.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [messageInput])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoadingConversations(true)
        const data = await getUserConversations()
        setConversations(data)
        if (data.length > 0) {
          setActiveConversationId((prev) => prev ?? data[0]._id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations')
      } finally {
        setLoadingConversations(false)
      }
    }

    if (token) {
      void loadConversations()
    }
  }, [token, conversationIdFromUrl])

  useEffect(() => {
    if (!token) return

    const socket = connectChatSocket(token)

    const handleNewMessage = (message: ChatMessage) => {
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv._id === message.conversationId) {
            return {
              ...conv,
              lastMessageId: {
                _id: message._id,
                content: message.content,
                messageType: message.messageType,
                sentAt: message.sentAt,
                senderId: getSenderId(message.senderId),
              },
              updatedAt: message.sentAt,
            }
          }
          return conv
        })
        return [...updated].sort((a, b) => (new Date(b.updatedAt ?? '').getTime() || 0) - (new Date(a.updatedAt ?? '').getTime() || 0))
      })

      if (message.conversationId === activeConversationRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev
          return [...prev, message]
        })

        if (isPageVisible && getSenderId(message.senderId) !== userIdRef.current) {
          socket.emit('message-read', message._id)
        }
      } else {
        // If conversation is not active and message is from another user, increment unread count
        if (getSenderId(message.senderId) !== userIdRef.current) {
          setUnreadCounts((prev) => ({
            ...prev,
            [message.conversationId]: (prev[message.conversationId] || 0) + 1,
          }))
        }
      }
    }

    const handleStatusUpdated = (data: { messageId: string; status: 'delivered' | 'read' }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? {
                ...msg,
                deliveryStatus: data.status,
                deliveredAt: data.status === 'delivered' ? new Date().toISOString() : msg.deliveredAt,
                readAt: data.status === 'read' ? new Date().toISOString() : msg.readAt,
              }
            : msg
        )
      )
    }

    const handleTyping = (data: { userId: string; username: string }) => {
      if (data.userId === userIdRef.current) return
      setTypingUsers((prev) => (prev.some((u) => u.userId === data.userId) ? prev : [...prev, data]))
    }

    const handleStoppedTyping = (data: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId))
    }

    socket.on('new-message', handleNewMessage)
    socket.on('message-status-updated', handleStatusUpdated)
    socket.on('user-typing', handleTyping)
    socket.on('user-stopped-typing', handleStoppedTyping)

    return () => {
      socket.off('new-message', handleNewMessage)
      socket.off('message-status-updated', handleStatusUpdated)
      socket.off('user-typing', handleTyping)
      socket.off('user-stopped-typing', handleStoppedTyping)
      disconnectChatSocket()
    }
  }, [token])

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversationId) return
      try {
        setLoadingMessages(true)
        const data = await getMessages(activeConversationId, 1, 50)
        const currentUserId = userIdRef.current
        
        // Only mark as read if page is visible
        if (isPageVisible) {
          const updatedMessages = data.message.map((msg) => {
            if (currentUserId && getSenderId(msg.senderId) !== currentUserId && msg.deliveryStatus !== 'read') {
              return { ...msg, deliveryStatus: 'read' as const, readAt: msg.readAt ?? new Date().toISOString() }
            }
            return msg
          })
          setMessages(updatedMessages)
          await markConversationAsRead(activeConversationId)

          if (currentUserId) {
            const socket = connectChatSocket(token as string)
            data.message
              .filter((msg) => getSenderId(msg.senderId) !== currentUserId && msg.deliveryStatus !== 'read')
              .forEach((msg) => socket.emit('message-read', msg._id))
          }
        } else {
          // If not visible, just set messages without marking as read
          setMessages(data.message)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      } finally {
        setLoadingMessages(false)
      }
    }

    if (activeConversationId && token) {
      const socket = connectChatSocket(token)
      socket.emit('join-conversation', activeConversationId)
      void loadMessages()
      setTypingUsers([])
    }
  }, [activeConversationId, token, isPageVisible])

  const activeConversation = useMemo(
    () => conversations.find((conv) => conv._id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  )

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeConversationId || !token) return
    const socket = connectChatSocket(token)
    socket.emit('send-message', {
      conversationId: activeConversationId,
      content: messageInput.trim(),
      messageType: 'text',
    })
    setMessageInput('')
    setShowEmojiPicker(false)
  }

  const handleMessageInputChange = (value: string) => {
    setMessageInput(value)
    if (!activeConversationId || !token) return
    const socket = connectChatSocket(token)
    socket.emit('typing-start', activeConversationId)
    if (typingTimeout.current) window.clearTimeout(typingTimeout.current)
    typingTimeout.current = window.setTimeout(() => {
      socket.emit('typing-stop', activeConversationId)
    }, 1200)
  }

  const handleMessageKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return
    if (event.shiftKey) return
    event.preventDefault()
    handleSendMessage()
  }

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setMessageInput((prev) => `${prev}${emojiData.emoji}`)
    messageInputRef.current?.focus()
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId)
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message')
    }
  }

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      window.setTimeout(() => {
        setCopiedMessageId((prev) => (prev === messageId ? null : prev))
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy message')
    }
  }

  const toggleMessageExpanded = (messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-amber-50 p-4 shadow-sm md:p-6 h-[calc(100vh-8rem)] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
        <section className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Conversations</h2>
            <span className="text-xs uppercase tracking-wide text-slate-400">Direct</span>
          </div>
        {loadingConversations && <div className="text-sm text-gray-500">Loading conversations...</div>}
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {conversations.map((conv) => {
            const lastMessage = getLastMessageSummary(conv)
            const isActive = conv._id === activeConversationId
            return (
            <button
              key={conv._id}
              onClick={() => {
                setActiveConversationId(conv._id)
                setUnreadCounts((prev) => ({
                  ...prev,
                  [conv._id]: 0,
                }))
              }}
              className={`w-full text-left p-3 rounded-xl border transition ${isActive ? 'border-blue-500/60 bg-blue-50 shadow-sm' : 'border-transparent hover:border-slate-200 hover:bg-white'}`}
            >
                <div className="flex items-center gap-3 min-w-0">
                  {getParticipantAvatar(conv, user?.userId) ? (
                    <img
                      src={getParticipantAvatar(conv, user?.userId) as string}
                      alt={getParticipantLabel(conv, user?.userId)}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600 ring-2 ring-white shadow">
                      {getParticipantLabel(conv, user?.userId).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{getParticipantLabel(conv, user?.userId)}</span>
                      <div className="flex items-center gap-2">
                        {unreadCounts[conv._id] > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCounts[conv._id] > 99 ? '99+' : unreadCounts[conv._id]}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{formatTime(lastMessage?.sentAt)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {lastMessage ? lastMessage.content : 'No messages yet'}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
          {!loadingConversations && conversations.length === 0 && (
            <div className="text-sm text-slate-500">No conversations yet. Start a chat from the friends list.</div>
          )}
        </div>
      </section>

      <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur flex flex-col h-full min-h-0">
        {activeConversation ? (
          <>
            <header className="border-b border-slate-200/70 px-5 py-4 flex items-center gap-3 shrink-0">
              {getParticipantAvatar(activeConversation, user?.userId) ? (
                <img
                  src={getParticipantAvatar(activeConversation, user?.userId) as string}
                  alt={getParticipantLabel(activeConversation, user?.userId)}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-semibold text-slate-600 ring-2 ring-white shadow">
                  {getParticipantLabel(activeConversation, user?.userId).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">{getParticipantLabel(activeConversation, user?.userId)}</h3>
                {typingUsers.length > 0 && (
                  <p className="text-sm text-blue-500">{typingUsers.map((u) => u.username).join(', ')} typing...</p>
                )}
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Online</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">Secure</span>
              </div>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-5 py-4">
              {loadingMessages ? (
                <div className="text-sm text-slate-500">Loading messages...</div>
              ) : (
                messages.map((msg) => {
                  const isOwn = getSenderId(msg.senderId) === user?.userId
                  const isExpanded = expandedMessages.has(msg._id)
                  const isLong = msg.content.length > 300
                  const displayContent = isLong && !isExpanded ? `${msg.content.slice(0, 300)}...` : msg.content
                  const isCopied = copiedMessageId === msg._id
                  return (
                    <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`group max-w-[70%] rounded-2xl px-4 py-3 shadow-sm break-words whitespace-pre-wrap ${isOwn ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white' : 'bg-white text-slate-900 border border-slate-200'} ${isCopied ? (isOwn ? 'ring-2 ring-blue-200' : 'ring-2 ring-blue-400') : ''}`}
                      >
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{displayContent}</p>
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => toggleMessageExpanded(msg._id)}
                            className={`mt-1 text-xs ${isOwn ? 'text-blue-100' : 'text-blue-600'} hover:underline`}
                          >
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                        <div className="mt-2 text-[11px] flex items-center justify-end gap-2 opacity-80">
                          <span>{formatTime(msg.sentAt)}</span>
                          {isOwn && (
                            <span>{msg.deliveryStatus === 'read' ? '✓✓' : msg.deliveryStatus === 'delivered' ? '✓✓' : '✓'}</span>
                          )}
                          {msg.isEdited && <span>(edited)</span>}
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isCopied && (
                            <span className={`text-xs ${isOwn ? 'text-blue-100' : 'text-blue-600'}`}>
                              Copied!
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg._id, msg.content)}
                            className={`flex items-center gap-1 text-xs ${isOwn ? 'text-blue-100 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                            title="Copy message"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M16 4H8a2 2 0 0 0-2 2v10" stroke="currentColor" strokeWidth="1.5" />
                              <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                            Copy
                          </button>
                          {isOwn && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg._id)}
                              className="flex items-center gap-1 text-xs text-red-200 hover:text-white"
                              title="Delete message"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M4 7h16" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M7 7l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" stroke="currentColor" strokeWidth="1.5" />
                              </svg>
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-slate-200/70 px-5 py-4 shrink-0">
              <div className="relative flex items-end gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="p-2 text-slate-500 hover:text-slate-900"
                  title="Add emoji"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M16 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M8 14c1.333 1.333 2.667 2 4 2s2.667-.667 4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-14 left-2 z-20">
                    <EmojiPicker
                      theme="light"
                      onEmojiClick={handleEmojiSelect}
                      searchPlaceHolder="Search"
                      height={360}
                      width={320}
                      skinTonesDisabled
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
                <textarea
                  ref={messageInputRef}
                  rows={1}
                  value={messageInput}
                  onChange={(e) => handleMessageInputChange(e.target.value)}
                  onKeyDown={handleMessageKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-slate-800 focus:outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-md"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">Select a conversation to start chatting.</div>
        )}
      </section>
    </div>
  </div>
  )
}

export default Chat
