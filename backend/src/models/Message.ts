import mongoose, { Schema, Model } from "mongoose";
import { IMessage } from "../types";

const messageSchema = new Schema<IMessage>({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },

    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    content: {
        type: String,
        required: true
    },

    messageType: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text'
    },

    mediaUrl: {
        type: String
    },

    deliveryStatus: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },

    sentAt: {
        type: Date,
        default: Date.now
    },

    deliveredAt: {
        type: Date
    },

    readAt: {
        type: Date
    },

    readBy: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },

    isEdited: {
        type: Boolean,
        default: false
    },

    editedAt: {
        type: Date
    },

    isDeleted: {
        type: Boolean,
        default: false
    },

    deletedAt: {
        type: Date
    },

    replyToMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },

    reactions: {
        type: [{
            emoji: {
                type: String,
                required: true
            },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            }
        }],
        default: []
    }

}, {
    timestamps: true
});

// Index for faster queries
messageSchema.index({ conversationId: 1, sentAt: -1 });
messageSchema.index({ senderId: 1 });

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);

export default Message;
