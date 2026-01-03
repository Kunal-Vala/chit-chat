import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
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
    },
    password: {
        type: String,
        required: true,
    },
    profilePicture: {
        type: String,
    },
    statusText: {
        type: String,
    },
    lastSeen: {
        type: String,
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('User', userSchema);
