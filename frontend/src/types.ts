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

export type MessageType = 'text' | 'image' | 'file'
export type DeliveryStatus = 'sent' | 'delivered' | 'read'

export interface MessageSummary {
    _id: string
    content: string
    messageType: MessageType
    sentAt: string
    senderId: string
}

export interface GroupMember {
    userId: string
    role: 'admin' | 'member'
    joinedAt?: Date
}

export interface Conversation {
    _id: string
    participants: UserProfile[]
    conversationType: 'direct' | 'group'
    groupName?: string
    groupAvatarUrl?: string
    groupDescription?: string
    groupMembers?: GroupMember[]
    lastMessageId?: MessageSummary | string
    createdAt?: string
    updatedAt?: string
}

export interface Group {
    _id: string
    name: string
    description?: string
    adminId: UserProfile | string
    memberIds: UserProfile[] | string[]
    groupPictureUrl?: string
    conversationId: string
    createdAt?: string
    updatedAt?: string
}

export interface ChatMessage {
    _id: string
    conversationId: string
    senderId: UserProfile | string
    content: string
    messageType: MessageType
    mediaUrl?: string
    deliveryStatus: DeliveryStatus
    sentAt: string
    deliveredAt?: string
    readAt?: string
    readBy?: string[]
    isEdited?: boolean
    editedAt?: string
    isDeleted?: boolean
    deletedAt?: string
}

export interface PaginationInfo {
    page: number
    limit: number
    total: number
    totalPages: number
}

