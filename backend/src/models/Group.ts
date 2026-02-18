import mongoose, { Schema, Model } from "mongoose";
import { IGroup } from "../types";

const groupSchema = new Schema<IGroup>({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100
    },

    description: {
        type: String,
        trim: true,
        maxlength: 500
    },

    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    memberIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    groupPictureUrl: {
        type: String
    },

    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    }

}, {
    timestamps: true
});

// Index for efficient queries
groupSchema.index({ adminId: 1 });
groupSchema.index({ memberIds: 1 });

const Group: Model<IGroup> = mongoose.model<IGroup>('Group', groupSchema);

export default Group;
