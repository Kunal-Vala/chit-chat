import mongoose, { Schema, Model } from "mongoose";
import { IUser } from "../types";

const userSchema = new Schema<IUser>({
    username: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilePictureUrl: {
        type: String,
    },
    statusText: {
        type: String,
    },
    onlineStatus: {
        type: Boolean,
        default: false,
    },
    lastSeen: {
        type: Date,
    },
    tokenVersion: {
        type: Number,
        default: 0,
    },
    friends: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: [],
    },
    friendRequests: {
        type: [{
            from: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            status: {
                type: String,
                enum: ['pending', 'accepted', 'rejected'],
                default: 'pending',
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }],
        default: [],
    },
    }, { timestamps: true });

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;