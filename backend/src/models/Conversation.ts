import mongoose, { Schema, Model } from "mongoose";
import { IConversation } from "../types";

const conversationSchema = new Schema<IConversation>({
    // For direct chats: [user1, user2]
    // For group chats: all member IDs (synced with groupMembers)
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],

    conversationType: {
        type: String,
        enum: ['direct', 'group'],
        default: 'direct'
    },

    groupName: {
        type: String,

    },

    groupAvatarUrl: {
        type: String
    },

    groupDescription: {
        type: String
    },

    groupMembers: {
        type: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            role: {
                type: String,
                enum: ['admin', 'member'],
                default: 'member'
            },
            joinedAt: {
                type: Date,
                default: Date.now
            },
        }],
        default: [],
    },

    lastMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },

    unreadCount: {
        type: Map,
        of: Number,
        default: new Map(),
    },

}, {
    timestamps: true
});

const Conversation: Model<IConversation> = mongoose.model<IConversation>('Conversation', conversationSchema);

export default Conversation;