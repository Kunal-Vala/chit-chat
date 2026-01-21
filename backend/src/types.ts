import { Request } from 'express';

export interface IUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  profilePictureUrl?: string;
  statusText?: string;
  onlineStatus?: boolean;
  lastSeen?: Date;
  tokenVersion?: number;
  createdAt?: Date;
  updatedAt?: Date;
  friends?: string[];
  friendRequests?: Array<{
    from: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt?: Date;
  }>;
}

export interface JwtPayloadType {
  userId: string;
  email: string;
  username: string;
  tokenVersion: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayloadType;
}

export interface SignInBody {
  email: string;
  password: string;
}


export interface IConversation {
  _id: string;
  participants: string[];
  type: 'direct' | 'group'
  groupName?: string
  groupAvatarUrl?: string;
  groupDescription?: string
  members?: Array<{
    userId: string;
    role: 'admin' | 'member';
    joinedAt?: Date;
  }>;
  unreadCount?: { [userId: string]: number };
  adminId?: string
  lastMessage?: string
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  mediaUrl?: string;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  readBy?: string[];
  isEdited?: boolean;
  editedAt?: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
  replyToMessageId?: string;
  reactions?: Array<{
    emoji: string;
    userId: string;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}