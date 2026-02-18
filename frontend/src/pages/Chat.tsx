import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react'
import { Users, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { connectChatSocket, disconnectChatSocket } from '../socket/chatSocket'
import { deleteMessage, getMessages, getUserConversations, markConversationAsRead } from '../api/chatApi'
import { CreateGroupModal } from '../components/CreateGroupModal'
import { GroupInfo } from '../components/GroupInfo'
import type { ChatMessage, Conversation, MessageSummary } from '../types'

const formatTime = (iso?: string) => {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toLocaleTimeString([], {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()

const formatDateLabel = (iso?: string) => {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (isSameDay(date, now)) return 'Today'
  if (isSameDay(date, yesterday)) return 'Yesterday'
  return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
}

const getSenderId = (senderId: ChatMessage['senderId']) => (typeof senderId === 'string' ? senderId : senderId._id)

const getParticipantLabel = (conversation: Conversation, currentUserId?: string) => {
  if (conversation.conversationType === 'group') {
    return conversation.groupName || 'Group Chat'
  }
  if (!currentUserId) return 'Conversation'
  const other = conversation.participants.find((p) => p._id !== currentUserId)
  return other?.username ?? 'Conversation'
}

const getParticipantAvatar = (conversation: Conversation, currentUserId?: string) => {
  if (conversation.conversationType === 'group') {
    return conversation.groupAvatarUrl || null
  }
  if (!currentUserId) return null
  const other = conversation.participants.find((p) => p._id !== currentUserId)
  return other?.profilePictureUrl ?? null
}

const getParticipantId = (conversation: Conversation, currentUserId?: string) => {
  if (!currentUserId) return null
  const other = conversation.participants.find((p) => p._id !== currentUserId)
  return other?._id ?? null
}

const getLastMessageSummary = (conversation: Conversation): MessageSummary | null => {
  if (typeof conversation.lastMessageId === 'string') return null
  return conversation.lastMessageId ?? null
}

function Chat() {
  const { user, token } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const conversationIdFromUrl = searchParams.get('conversationId')
  const conversationQuery = (searchParams.get('q') ?? '').trim().toLowerCase()
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
  const [showMessagesInMobile, setShowMessagesInMobile] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [groupNotification, setGroupNotification] = useState<string | null>(null)

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

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
    })
  }

  useEffect(() => {
    scrollToBottom('smooth')
  }, [messages])

  useEffect(() => {
    if (!activeConversationId) return
    if (loadingMessages) return
    if (!isPageVisible) return
    scrollToBottom('auto')
  }, [activeConversationId, loadingMessages, isPageVisible])

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoadingConversations(true)
        const data = await getUserConversations()
        setConversations(data)
        // Don't auto-select first conversation - let user choose
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

    const handleNewGroupMessage = (data: { groupId: string; message: ChatMessage }) => {
      handleNewMessage(data.message)
    }

    const handleMemberAdded = (data: { groupId: string; memberIds: string[] }) => {
      setGroupNotification(`${data.memberIds.length} member(s) added to the group`)
      setTimeout(() => setGroupNotification(null), 3000)
    }

    const handleMemberRemoved = () => {
      setGroupNotification('A member was removed from the group')
      setTimeout(() => setGroupNotification(null), 3000)
    }

    const handleRemovedFromGroup = () => {
      setGroupNotification('You were removed from the group')
      setTimeout(() => setGroupNotification(null), 3000)
      // Reload conversations
      void getUserConversations().then(setConversations)
    }

    const handleGroupUpdated = () => {
      setGroupNotification('Group details updated')
      setTimeout(() => setGroupNotification(null), 3000)
      // Reload conversations
      void getUserConversations().then(setConversations)
    }

    socket.on('new-message', handleNewMessage)
    socket.on('new-group-message', handleNewGroupMessage)
    socket.on('message-status-updated', handleStatusUpdated)
    socket.on('user-typing', handleTyping)
    socket.on('user-stopped-typing', handleStoppedTyping)
    socket.on('member-added', handleMemberAdded)
    socket.on('member-removed', handleMemberRemoved)
    socket.on('removed-from-group', handleRemovedFromGroup)
    socket.on('group-updated', handleGroupUpdated)

    return () => {
      socket.off('new-message', handleNewMessage)
      socket.off('new-group-message', handleNewGroupMessage)
      socket.off('message-status-updated', handleStatusUpdated)
      socket.off('user-typing', handleTyping)
      socket.off('user-stopped-typing', handleStoppedTyping)
      socket.off('member-added', handleMemberAdded)
      socket.off('member-removed', handleMemberRemoved)
      socket.off('removed-from-group', handleRemovedFromGroup)
      socket.off('group-updated', handleGroupUpdated)
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
      const activeConv = conversations.find(c => c._id === activeConversationId)
      if (activeConv?.conversationType === 'group') {
        // For groups, we need to find the group ID and join the group room
        // The backend uses conversationId for group rooms
        socket.emit('join-conversation', activeConversationId)
      } else {
        socket.emit('join-conversation', activeConversationId)
      }
      void loadMessages()
      setTypingUsers([])
    }
  }, [activeConversationId, token, isPageVisible])

  const activeConversation = useMemo(
    () => conversations.find((conv) => conv._id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  )

  const filteredConversations = useMemo(() => {
    if (!conversationQuery) return conversations
    return conversations.filter((conv) => {
      const label = getParticipantLabel(conv, user?.userId).toLowerCase()
      const lastMessage = getLastMessageSummary(conv)?.content?.toLowerCase() ?? ''
      return label.includes(conversationQuery) || lastMessage.includes(conversationQuery)
    })
  }, [conversations, conversationQuery, user?.userId])

  const firstUnreadMessageId = useMemo(() => {
    const currentUserId = user?.userId
    if (!currentUserId) return null
    const firstUnread = messages.find(
      (msg) => getSenderId(msg.senderId) !== currentUserId && msg.deliveryStatus !== 'read'
    )
    return firstUnread?._id ?? null
  }, [messages, user?.userId])

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
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden app-chat-shell p-3 lg:p-4">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-full min-h-0">
        <section className={`app-panel p-4 flex flex-col h-full min-h-0 ${showMessagesInMobile ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b app-border">
            <div>
              <h2 className="text-base font-semibold">Messages</h2>
              <p className="text-xs app-muted">Keep the flow going</p>
            </div>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="app-icon-button app-icon-accent"
              title="Create Group"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        {loadingConversations && <div className="text-sm app-muted">Loading conversations...</div>}
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {filteredConversations.map((conv) => {
            const lastMessage = getLastMessageSummary(conv)
            const isActive = conv._id === activeConversationId
            return (
            <button
              key={conv._id}
              onClick={() => {
                setActiveConversationId(conv._id)
                setShowMessagesInMobile(true)
                setUnreadCounts((prev) => ({
                  ...prev,
                  [conv._id]: 0,
                }))
              }}
              className={`w-full text-left p-3 rounded-xl transition border ${isActive ? 'border-transparent shadow-sm' : 'border-transparent hover:border-[color:var(--app-border)]'} ${isActive ? 'bg-[color:var(--app-surface-elev)]' : 'hover:bg-[color:var(--app-surface-elev)]'}`}
            >
                <div className="flex items-center gap-3 min-w-0">
                  {getParticipantAvatar(conv, user?.userId) ? (
                    <img
                      src={getParticipantAvatar(conv, user?.userId) as string}
                      alt={getParticipantLabel(conv, user?.userId)}
                      className="app-avatar-img"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-sm font-semibold text-white shadow-sm">
                      {getParticipantLabel(conv, user?.userId).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-[15px]">{getParticipantLabel(conv, user?.userId)}</span>
                      <div className="flex items-center gap-2">
                        {unreadCounts[conv._id] > 0 && (
                          <span className="app-pill min-w-[20px] h-5 px-1.5 justify-center">
                            {unreadCounts[conv._id] > 99 ? '99+' : unreadCounts[conv._id]}
                          </span>
                        )}
                        <span className="text-[11px] app-muted">{formatTime(lastMessage?.sentAt)}</span>
                      </div>
                    </div>
                    <p className="text-[13px] app-muted truncate">
                      {lastMessage ? lastMessage.content : 'No messages yet'}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
          {!loadingConversations && filteredConversations.length === 0 && (
            conversationQuery ? (
              <div className="text-sm app-muted">No matches for “{conversationQuery}”.</div>
            ) : (
            <div className="text-sm app-muted">No conversations yet. Start a chat from the friends list.</div>
            )
          )}
        </div>
      </section>

      <section className={`app-panel flex flex-col h-full min-h-0 ${showMessagesInMobile ? 'flex' : 'hidden lg:flex'}`}>
        {activeConversation ? (
          <>
            <header className="app-panel-header px-6 py-4 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowMessagesInMobile(false)}
                className="lg:hidden p-2 -ml-2 app-muted hover:text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-elev)] rounded-lg transition"
                title="Back to conversations"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (activeConversation.conversationType === 'group') {
                    setShowGroupInfo(true)
                  } else {
                    const participantId = getParticipantId(activeConversation, user?.userId)
                    if (participantId) navigate(`/user/${participantId}`)
                  }
                }}
                className="flex items-center gap-3 flex-1 hover:opacity-80 transition cursor-pointer"
                title={activeConversation.conversationType === 'group' ? 'View group info' : 'View profile'}
              >
                {getParticipantAvatar(activeConversation, user?.userId) ? (
                  <img
                    src={getParticipantAvatar(activeConversation, user?.userId) as string}
                    alt={getParticipantLabel(activeConversation, user?.userId)}
                    className="app-avatar-img"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-lg font-semibold text-white shadow">
                    {getParticipantLabel(activeConversation, user?.userId).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <h3 className="text-base font-semibold">{getParticipantLabel(activeConversation, user?.userId)}</h3>
                  {activeConversation.conversationType === 'group' ? (
                    <p className="text-xs app-muted">{activeConversation.participants.length} members</p>
                  ) : typingUsers.length > 0 ? (
                    <p className="text-xs text-blue-500">typing...</p>
                  ) : null}
                </div>
              </button>
              <div className="flex items-center gap-2">
                {activeConversation.conversationType === 'group' && (
                  <button
                    onClick={() => setShowGroupInfo(true)}
                    className="app-icon-button"
                    title="Group Info"
                  >
                    <Info className="h-5 w-5" />
                  </button>
                )}
                {activeConversation.conversationType === 'direct' && (
                  <div className="hidden md:flex items-center gap-2 text-xs">
                    <span className="app-pill">Online</span>
                  </div>
                )}
              </div>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
              {groupNotification && (
                <div className="mb-4 rounded-lg border app-border p-3 text-center text-sm">
                  {groupNotification}
                </div>
              )}
              {loadingMessages ? (
                <div className="text-sm app-muted">Loading messages...</div>
              ) : (
                messages.map((msg, index) => {
                  const isOwn = getSenderId(msg.senderId) === user?.userId
                  const isExpanded = expandedMessages.has(msg._id)
                  const isLong = msg.content.length > 300
                  const displayContent = isLong && !isExpanded ? `${msg.content.slice(0, 300)}...` : msg.content
                  const isCopied = copiedMessageId === msg._id
                  const previous = messages[index - 1]
                  const showDateDivider = !previous || !isSameDay(new Date(previous.sentAt), new Date(msg.sentAt))
                  const showUnreadDivider = firstUnreadMessageId === msg._id
                  return (
                    <div key={msg._id} className="mb-4">
                      {showDateDivider && (
                        <div className="flex items-center justify-center my-6">
                          <span className="px-4 py-1.5 text-xs font-medium app-card-inner">
                            {formatDateLabel(msg.sentAt)}
                          </span>
                        </div>
                      )}
                      {showUnreadDivider && (
                        <div className="flex items-center gap-3 text-xs my-6">
                          <span className="flex-1 h-px bg-red-300" />
                          <span className="app-pill">Unread messages</span>
                          <span className="flex-1 h-px bg-red-300" />
                        </div>
                      )}
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`group max-w-[600px] break-words whitespace-pre-wrap app-bubble ${isOwn ? 'app-bubble-own' : 'app-bubble-other'} ${isCopied ? 'ring-2 ring-[color:var(--app-ring)]' : ''}`}
                        >
                          {!isOwn && activeConversation?.conversationType === 'group' && typeof msg.senderId !== 'string' && (
                            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--app-accent-2)' }}>{msg.senderId.username}</p>
                          )}
                          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{displayContent}</p>
                          {isLong && (
                            <button
                              type="button"
                              onClick={() => toggleMessageExpanded(msg._id)}
                              className={`mt-1.5 text-xs font-medium ${isOwn ? 'text-white/80 hover:text-white' : 'text-[color:var(--app-accent-2)] hover:text-[color:var(--app-accent)]'} hover:underline`}
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}
                          <div className="mt-1.5 text-[11px] flex items-center justify-end gap-1.5 opacity-70">
                            <span>{formatTime(msg.sentAt)}</span>
                            {isOwn && (
                              <span>{msg.deliveryStatus === 'read' ? '✓✓' : msg.deliveryStatus === 'delivered' ? '✓✓' : '✓'}</span>
                            )}
                            {msg.isEdited && <span>(edited)</span>}
                          </div>
                          <div className="mt-1 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isCopied && (
                              <span className={`text-xs ${isOwn ? 'text-white/80' : 'text-[color:var(--app-accent-2)]'}`}>
                                Copied!
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg._id, msg.content)}
                              className={`flex items-center gap-1 text-xs ${isOwn ? 'text-white/80 hover:text-white' : 'app-muted hover:text-[color:var(--app-text)]'}`}
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
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-6 py-4 shrink-0">
              <div className="relative flex items-end gap-3 rounded-2xl border app-border app-card-inner px-4 py-3 focus-within:ring-2 focus-within:ring-[color:var(--app-ring)] transition">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="app-icon-button"
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
                  className="flex-1 resize-none bg-transparent px-2 py-1 text-[15px] leading-relaxed text-[color:var(--app-text)] placeholder:text-[color:var(--app-muted)] focus:outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="app-primary-button px-5 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="max-w-md text-center space-y-5">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-blue-500">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">No conversation selected</h3>
                <p className="text-sm app-muted">
                  Choose a conversation from the list to start chatting, or go to the friends list to start a new conversation.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={async () => {
          const data = await getUserConversations()
          setConversations(data)
        }}
      />
      {activeConversation?.conversationType === 'group' && user && (
        <GroupInfo
          conversationId={activeConversation._id}
          currentUserId={user.userId}
          isOpen={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          onGroupUpdated={async () => {
            const data = await getUserConversations()
            setConversations(data)
          }}
          onGroupDeleted={() => {
            setActiveConversationId(null)
            void getUserConversations().then(setConversations)
          }}
        />
      )}
  </div>
  )
}

export default Chat
