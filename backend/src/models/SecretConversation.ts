import mongoose, { Schema, Model } from "mongoose";
import { ISecretConversation } from "../types";

const secretConversationSchema = new Schema<ISecretConversation>({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SecretMessage'
    }
}, {
    timestamps: true
});

const SecretConversation: Model<ISecretConversation> = mongoose.model<ISecretConversation>('SecretConversation', secretConversationSchema);

export default SecretConversation;
