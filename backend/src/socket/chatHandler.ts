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

    io.on('connection', (socket: Socket) => {
        const userId = socket.data.userId;

        // store online user

        onlineUsers.set(userId, socket.id);

        // update user online status in db
        User.findByIdAndUpdate(userId, {
            onlineStatus: true,
            lastSeen: new Date(),

        }).catch(console.error);

        // Broadcast online status to friends

        socket.broadcast.emit('user-online', { userId });

        console.log(`User ${socket.data.username} connected`);


        // Join Conversation Room

        socket.on('join-conversation', async (conversationId: string) => {
            await socket.join(conversationId);
            console.log(`User ${userId} joined conversation ${conversationId}`);
        });

        // send message

        socket.on('send-message', async (data: {
            conversationId: string;
            content: string;
            messageType: 'text' | 'image' | 'file';
            mediaUrl?: string;
        }) => {
            try {
                // create message in database

                const message = await Message.create({
                    conversationId: data.conversationId,
                    senderId: userId,
                    content: data.content,
                    messageType: data.messageType,
                    mediaUrl: data.mediaUrl,
                    deliveryStatus: 'send',
                    sentAt: new Date(),
                });

                // Populate sender info
                await message.populate('senderId', 'username profilePictureUrl');

                // Update conversation's lastMessage
                await Conversation.findByIdAndUpdate(data.conversationId, {
                    lastMessageId: message._id
                });

                // emit conversation room
                io.to(data.conversationId).emit('new-message', message);


                // Get conversation participants
                const conversation = await Conversation.findById(data.conversationId);

                if (conversation) {
                    // mark as delivered for online users
                    const otherParticipants = conversation.participants.filter(
                        p => p.toString() !== userId
                    );

                    otherParticipants.forEach(participateId => {
                        const recipientSocketId = onlineUsers.get(participateId.toString());
                        if (recipientSocketId) {
                            // update delivery status
                            Message.findByIdAndUpdate(message._id, {
                                deliveryStatus: 'delivered',
                                deliveredAt: new Date(),
                            }).catch(console.error);
                        }
                    });
                }


            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('message-error', { error: 'Failed to send message' });
            }
        });


    });
};

