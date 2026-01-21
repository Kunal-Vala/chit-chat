export interface UserProfile {
    _id: string
    username: string
    email: string
    profilePictureUrl?: string
    statusText?: string
    onlineStatus?: boolean
    lastSeen?: Date
}

export interface FriendRequest {
    from: UserProfile | string
    status: 'pending' | 'accepted' | 'rejected'
    createdAt?: Date
}

