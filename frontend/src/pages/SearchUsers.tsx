import type { ChatMessage, Conversation, UserProfile } from "../types";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { searchUsers, sendFriendRequest } from "../api/userApi";
import { getUserConversations, searchMessages } from "../api/chatApi";
import { useAuth } from "../context/AuthContext";

function SearchUsers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<UserProfile[]>([]);
  const [messageResults, setMessageResults] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [requestSent, setRequestSent] = useState<Set<string>>(new Set())


  useEffect(() => {
    const nextQuery = searchParams.get('q') ?? ''
    setQuery(nextQuery)
  }, [searchParams])

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await getUserConversations()
        setConversations(data)
      } catch {
        // Non-blocking: users and messages can still be searched without labels.
      }
    }

    void loadConversations()
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim()) {
        try {
          setLoading(true);
          const [userData, messageData] = await Promise.all([
            searchUsers(query, 20),
            searchMessages(query, undefined, 1, 20)
          ])

          setResults(userData.users.filter((candidate) => candidate._id !== user?.userId));
          setMessageResults(messageData.results)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Search failed");
        } finally {
          setLoading(false);
        }
      } else {
        setResults([])
        setMessageResults([])
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, user?.userId]);

  const getConversationId = (message: ChatMessage): string => {
    if (typeof message.conversationId === 'string') return message.conversationId
    const maybeConversation = message.conversationId as unknown as { _id?: string }
    return maybeConversation?._id ?? ''
  }

  const getConversationLabel = (conversationId: string): string => {
    const conversation = conversations.find((item) => item._id === conversationId)
    if (!conversation) return 'Conversation'

    if (conversation.conversationType === 'group') {
      return conversation.groupName || 'Group Chat'
    }

    const participant = conversation.participants.find((candidate) => candidate._id !== user?.userId)
    return participant?.username || 'Direct Chat'
  }


  const handleAddFriend = async (userId : string) => {
    try{
      await sendFriendRequest(userId)
      setRequestSent(prev => new Set(prev).add(userId))
    }catch(err){
      setError(err instanceof Error ? err.message : "Failed to send friend request");
    }
  }


  return (
    <div className="app-page">
      <div className="app-card p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-2 font-display">Search Users</h1>
        <p className="app-muted mb-6">Find people and build your inner circle.</p>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by username..."
            value={query}
            onChange={e => {
              const value = e.target.value
              setQuery(value)
              if (value.trim()) {
                setSearchParams({ q: value }, { replace: true })
              } else {
                setSearchParams({}, { replace: true })
              }
            }}
            className="app-input"
          />
        </div>

        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

        {loading && <div className="mb-4 p-4 text-center py-8 app-card-inner">Searching...</div>}

        <div className="grid gap-4">
          {query && !loading && messageResults.length > 0 && (
            <div className="app-card-inner p-4">
              <h2 className="text-sm font-semibold mb-3">Matching Messages</h2>
              <div className="space-y-3">
                {messageResults.map((message) => {
                  const senderName = typeof message.senderId === 'string' ? 'Unknown' : message.senderId.username
                  const conversationId = getConversationId(message)
                  return (
                    <button
                      key={message._id}
                      className="w-full text-left rounded-lg border app-border px-3 py-2 hover:bg-[color:var(--app-surface-elev)] transition"
                      onClick={() => {
                        if (!conversationId) return
                        navigate(`/chat?conversationId=${encodeURIComponent(conversationId)}`)
                      }}
                    >
                      <p className="text-xs app-muted mb-1">
                        {getConversationLabel(conversationId)} · {senderName}
                      </p>
                      <p className="text-sm line-clamp-2">{message.content || '(No text content)'}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {results.length > 0 ? (
            results.map(user => (
              <div key={user._id} className="app-card-inner p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => navigate(`/user/${user._id}`)}
                >
                  {user.profilePictureUrl ? (
                    <img src={user.profilePictureUrl} alt={user.username} className="app-avatar-img lg" />
                  ) : (
                    <div className="app-avatar-img lg flex items-center justify-center">
                      <span className="text-xl font-semibold app-muted">{user.username?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold">{user.username}</h3>
                    {user.statusText && <p className="app-muted text-sm italic">{user.statusText}</p>}
                  </div>
                </div>

                <button
                  onClick={() => handleAddFriend(user._id)}
                  disabled={requestSent.has(user._id)}
                  className={`app-primary-button whitespace-nowrap ${requestSent.has(user._id)
                      ? 'opacity-60 cursor-not-allowed'
                      : ''
                    }`}
                >
                  {requestSent.has(user._id) ? 'Request Sent' : 'Add Friend'}
                </button>
              </div>
            ))
          ): query && !loading ? (
            <div className="text-center py-8 app-muted">
              {messageResults.length > 0 ? 'No users found, but matching messages are shown above.' : 'No users or messages found'}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )





}




export default SearchUsers;
