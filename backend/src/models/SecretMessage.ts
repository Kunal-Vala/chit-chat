import mongoose, { Schema, Model } from "mongoose";
import { ISecretMessage } from "../types";

const secretMessageSchema = new Schema<ISecretMessage>({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SecretConversation',
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
    iv: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['text'],
        default: 'text'
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
    expiresAt: {
        type: Date,
        index: { expires: 0 } // Deletes the document exactly at the expiresAt time
    }
}, {
    timestamps: true
});

// For fast querying
secretMessageSchema.index({ conversationId: 1, sentAt: -1 });

const SecretMessage: Model<ISecretMessage> = mongoose.model<ISecretMessage>('SecretMessage', secretMessageSchema);

export default SecretMessage;
