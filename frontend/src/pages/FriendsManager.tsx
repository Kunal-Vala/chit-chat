import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FriendRequest, UserProfile } from "../types";
import { deleteFriend, getFriendRequests, getFriendsList } from "../api/userApi";
import { set } from "zod";

function FriendManager() {
    const navigate = useNavigate()
    const [friends, setFriends] = useState<UserProfile[]>([])
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends")

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
        try {
            await deleteFriend(friendId)
            setFriends(prev => prev.filter(f => f._id !== friendId))

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete friend")
        }
    }










    if (loading) return <div className="text-center py-8">Loading...</div>

    return (
        <div className="max-w-4xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Friends</h1>

            {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

            {/* Tabs for Friends and Requests */}
            <div className="flex gap-4 mb-6 border-b">
                <button
                    onClick={() => setActiveTab('friends')}
                    className={`px-4 py-2 font-semibold ${activeTab === 'friends' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
                >
                    Friends ({friends.length})
                </button>

                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-4 py-2 font-semibold ${activeTab === 'requests' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
                >
                    Requests ({friendRequests.length})
                </button>
            </div>

            {/* Friends Tab Content */}

            {activeTab === 'friends' && (
                <div className="grid gap-4">
                    {friends.length > 0 ? (
                        friends.map(friend => (
                            <div key={friend._id} className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between">
                                <div
                                    className="flex gap-4 items-center cursor-pointer flex-1"
                                    onClick={() => navigate(`/user/${friend._id}`)}
                                >
                                    {friend.profilePictureUrl ? (
                                        <img src={friend.profilePictureUrl} alt={friend.username} className="w-18 h-18 rounded-full  border-2 border-black-400 object-cover" />
                                    ) : (
                                        <div className="w-18 h-18 rounded-full border-2 border-black-400 bg-gray-300 flex items-center justify-center ">
                                            <span className="text-2xl font-semibold text-gray-600">{friend.username?.charAt(0).toUpperCase()}</span>
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-lg font-semibold">{friend.username}</h3>
                                        {friend.statusText && <p className="text-sm text-gray-500">{friend.statusText}</p>}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDeleteFriend(friend._id)}
                                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                                >
                                    Remove
                                </button>
                            </div>
                        ))

                    ) : (
                        <div className="text-center py-8 text-gray-500">No friends yet. Start searching!</div>
                    )}
                </div>
            )}
        </div>
    )
}

export default FriendManager