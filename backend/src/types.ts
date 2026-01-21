import { Request } from 'express';
import { Types } from 'mongoose';

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
  participants: string[]; // For direct chats: [user1, user2]. For groups: all member IDs
  conversationType: 'direct' | 'group'
  groupName?: string
  groupAvatarUrl?: string;
  groupDescription?: string
  groupMembers?: Array<{ // Only used for group chats
    userId: string;
    role: 'admin' | 'member';
    joinedAt?: Date;
  }>;
  unreadCount?: { [userId: string]: number };
  lastMessageId?: string; // Reference to the last message
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMessage {
  _id: string;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'file';
  mediaUrl?: string;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  readBy?: Types.ObjectId[];
  isEdited?: boolean;
  editedAt?: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
  replyToMessageId?: Types.ObjectId;
  reactions?: Array<{
    emoji: string;
    userId: Types.ObjectId;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}