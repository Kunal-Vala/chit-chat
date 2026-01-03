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
    }
}, { timestamps: true });

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;