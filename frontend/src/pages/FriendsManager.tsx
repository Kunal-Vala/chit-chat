import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FriendRequest, UserProfile } from "../types";
import { getFriendRequests, getFriendsList } from "../api/userApi";

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
}

export default FriendManager