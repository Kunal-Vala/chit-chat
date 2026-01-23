import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message";
import Conversation from "../models/Conversation";
import { JwtPayloadType } from "../types";
import User from "../models/User";
import { JWT_SECRET } from "../config/env";


// Store online users: userId -> socketId
const onlineUsers = new Map<string, string>();


export const getOnlineUsers = () => {
    return Array.from(onlineUsers.keys());
};



export const setupChatHandlers = (io: Server) => {

    // Socket.io middleware for Authentication 

    io.use((socket, next) => {

        const token = socket.handshake.auth.token;

        if (token) {
            return next(new Error("Authentication Failed"));
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as JwtPayloadType;
            socket.data.userId = decoded.userId;
            socket.data.username = decoded.username;
            next();

        } catch (err) {
            next(new Error(err + "Authentication Error"));
        }
    });

    
}

