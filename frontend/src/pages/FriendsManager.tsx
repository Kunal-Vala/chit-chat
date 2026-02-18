import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FriendRequest, UserProfile } from "../types";
import { acceptFriendRequest, deleteFriend, getFriendRequests, getFriendsList, rejectFriendRequest } from "../api/userApi";
import { createConversation } from "../api/chatApi";

function FriendsManager() {
    const navigate = useNavigate()
    const [friends, setFriends] = useState<UserProfile[]>([])
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends")
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
    const [friendToDelete, setFriendToDelete] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [friendsData, requestsData] = await Promise.all([
                    getFriendsList(),
                    getFriendRequests(),
                ])
                setFriends(friendsData)
                setFriendRequests(requestsData.filter(req => req.status === "pending"))
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load data")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleDeleteFriend = async (friendId: string) => {
        setFriendToDelete(friendId)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        if (!friendToDelete) return

        try {
            await deleteFriend(friendToDelete)
            setFriends(prev => prev.filter(f => f._id !== friendToDelete))
            setShowDeleteModal(false)
            setFriendToDelete(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete friend")
        }
    }

    const cancelDelete = () => {
        setShowDeleteModal(false)
        setFriendToDelete(null)
    }

    const handleAcceptRequest = async (fromUserId: string) => {
        try {
            await acceptFriendRequest(fromUserId)
            setFriendRequests(prev => prev.filter(req => {
                const fromId = typeof req.from === 'string' ? req.from : req.from._id
                return fromId !== fromUserId
            }))

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to accept friend request")
        }
    }

    const handleRejectRequest = async (senderId: string) => {
        try {
            await rejectFriendRequest(senderId)
            setFriendRequests(prev => prev.filter(req => {
                const fromId = typeof req.from === 'string' ? req.from : req.from._id
                return fromId !== senderId
            }))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reject request')
        }
    }

    const handleStartConversation = async (friendId: string) => {
        try {
            const conversation = await createConversation(friendId)
            navigate(`/chat?conversationId=${conversation._id}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start conversation')
        }
    }




    if (loading) return <div className="text-center py-8 app-muted">Loading...</div>

    return (
        <div className="app-page">
            <div className="app-card p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold font-display">Friends</h1>
                        <p className="app-muted">Keep your people close and responsive.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('friends')}
                            className={`app-tab ${activeTab === 'friends' ? 'is-active' : ''}`}
                        >
                            Friends ({friends.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`app-tab ${activeTab === 'requests' ? 'is-active' : ''}`}
                        >
                            Requests ({friendRequests.length})
                        </button>
                    </div>
                </div>

                {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

                {activeTab === 'friends' && (
                    <div className="grid gap-4">
                        {friends.length > 0 ? (
                            friends.map(friend => (
                                <div key={friend._id} className="app-card-inner p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div
                                        className="flex gap-4 items-center cursor-pointer flex-1"
                                        onClick={() => navigate(`/user/${friend._id}`)}
                                    >
                                        {friend.profilePictureUrl ? (
                                            <img src={friend.profilePictureUrl} alt={friend.username} className="app-avatar-img lg" />
                                        ) : (
                                            <div className="app-avatar-img lg flex items-center justify-center">
                                                <span className="text-2xl font-semibold app-muted">{friend.username?.charAt(0).toUpperCase()}</span>
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-lg font-semibold">{friend.username}</h3>
                                            {friend.statusText && <p className="text-sm app-muted">{friend.statusText}</p>}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={() => handleStartConversation(friend._id)}
                                                className="app-primary-button">
                                            Message
                                        </button>
                                        <button
                                            onClick={() => handleDeleteFriend(friend._id)}
                                            className="app-secondary-button"
                                            >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))

                        ) : (
                            <div className="text-center py-8 app-muted">No friends yet. Start searching!</div>
                        )}
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="grid gap-4">
                        {friendRequests.length > 0 ? (
                            friendRequests.map(request => {
                                const fromUser = typeof request.from === 'string' ? null : request.from
                                const fromId = typeof request.from === 'string' ? request.from : request.from._id

                                return (
                                    <div key={fromId} className="app-card-inner p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            {fromUser?.profilePictureUrl ? (
                                                <img src={fromUser.profilePictureUrl} alt={fromUser.username} className="app-avatar-img lg" />
                                            ) : (
                                                <div className="app-avatar-img lg flex items-center justify-center">
                                                    <span className="text-2xl app-muted">{fromUser?.username?.[0]?.toUpperCase() || '?'}</span>
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-lg font-semibold">{fromUser?.username || 'Unknown User'}</h3>
                                                {fromUser?.statusText && <p className="app-muted text-sm">{fromUser.statusText}</p>}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAcceptRequest(fromId)}
                                                className="app-primary-button"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleRejectRequest(fromId)}
                                                className="app-secondary-button"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="text-center py-8 app-muted">No pending requests</div>
                        )}
                    </div>
                )}

                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="app-card p-6 max-w-sm w-full mx-4">
                            <h3 className="text-xl font-bold mb-2">Remove Friend?</h3>
                            <p className="app-muted mb-6">Are you sure you want to remove this friend? This action cannot be undone.</p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={cancelDelete}
                                    className="app-secondary-button"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="app-primary-button"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default FriendsManager