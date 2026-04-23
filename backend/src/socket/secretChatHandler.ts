import { Server, Socket } from "socket.io";
import { onlineUsers } from "./chatHandler";
import SecretConversation from "../models/SecretConversation";
import SecretMessage from "../models/SecretMessage";

export const setupSecretChatHandlers = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        const userId = socket.data.userId;
        const username = socket.data.username;

        // 1. Handshake: User A requests a secret chat with User B
        socket.on('secret-chat-request', async (data: { recipientId: string; publicKey: string }) => {
            const recipientSocketIds = onlineUsers.get(data.recipientId);
            if (recipientSocketIds && recipientSocketIds.size > 0) {
                // Send request to all connected devices of the recipient
                io.to(Array.from(recipientSocketIds)).emit('secret-chat-request-received', {
                    requesterId: userId,
                    requesterUsername: username,
                    publicKey: data.publicKey
                });
            } else {
                // Recipient is offline, secret chat cannot be established
                socket.emit('secret-chat-error', { error: 'User is offline' });
            }
        });

        // 2. Handshake: User B accepts and sends back their public key
        socket.on('secret-chat-accept', async (data: { requesterId: string; publicKey: string }) => {
            const requesterSocketIds = onlineUsers.get(data.requesterId);
            if (requesterSocketIds && requesterSocketIds.size > 0) {
                // Determine participants
                const participants = [userId, data.requesterId];

                // Create a temporary SecretConversation record
                const conversation = await SecretConversation.create({
                    participants: participants
                });

                // Notify requester
                io.to(Array.from(requesterSocketIds)).emit('secret-chat-accepted', {
                    recipientId: userId,
                    recipientUsername: username,
                    publicKey: data.publicKey,
                    conversationId: conversation._id
                });
                
                // Notify the accepting user's specific socket (in case of multiple devices, only this one accepted)
                socket.emit('secret-chat-ready', {
                    conversationId: conversation._id
                });
            }
        });

        socket.on('secret-chat-decline', (data: { requesterId: string }) => {
             const requesterSocketIds = onlineUsers.get(data.requesterId);
             if (requesterSocketIds && requesterSocketIds.size > 0) {
                 io.to(Array.from(requesterSocketIds)).emit('secret-chat-declined', {
                     recipientId: userId
                 });
             }
        });

        // Join Secret Conversation Room
        socket.on('join-secret-conversation', async (conversationId: string) => {
            await socket.join(`secret_${conversationId}`);
        });

        socket.on('send-secret-message', async (data: {
            conversationId: string;
            content: string; // encrypted base64 payload
            iv: string; // base64 initialization vector
            tempId: string;
        }) => {
            try {
                // Temporarily store the encrypted message with null expiresAt
                const message = await SecretMessage.create({
                    conversationId: data.conversationId,
                    senderId: userId,
                    content: data.content,
                    iv: data.iv,
                    deliveryStatus: 'sent',
                    sentAt: new Date()
                });

                await message.populate('senderId', 'username profilePictureUrl');

                await SecretConversation.findByIdAndUpdate(data.conversationId, {
                    lastMessageId: message._id
                });
                
                // map tempId to realId on sender's client so they can track read receipts
                socket.emit('secret-message-sent-ack', { tempId: data.tempId, realId: message._id.toString() });

                // emit to the secret conversation room except sender
                socket.broadcast.to(`secret_${data.conversationId}`).emit('new-secret-message', message);

                // Mark as delivered
                const conversation = await SecretConversation.findById(data.conversationId);
                if (conversation) {
                    const otherParticipants = conversation.participants.filter(
                        p => p.toString() !== userId
                    );

                    otherParticipants.forEach(participateId => {
                        const recipientSocketIds = onlineUsers.get(participateId.toString());
                        if (recipientSocketIds && recipientSocketIds.size > 0) {
                            SecretMessage.findByIdAndUpdate(message._id, {
                                deliveryStatus: 'delivered',
                                deliveredAt: new Date(),
                            }).catch(console.error);
                        }
                    });
                }
            } catch (error) {
                console.error('Error sending secret message:', error);
                socket.emit('secret-message-error', { error: 'Failed to send encrypted message' });
            }
        });

        // 4. Message Read acknowledgment & start TTL timer
        socket.on('secret-message-read', async (messageId: string) => {
            try {
                // Set TTL expiration to 1 minute from now
                const expireDate = new Date(Date.now() + 60 * 1000);

                const message = await SecretMessage.findByIdAndUpdate(
                    messageId,
                    {
                        deliveryStatus: 'read',
                        readAt: new Date(),
                        expiresAt: expireDate
                    },
                    { new: true }
                );

                if (message) {
                    const senderSocketIds = onlineUsers.get(message.senderId.toString());
                    if (senderSocketIds && senderSocketIds.size > 0) {
                        io.to(Array.from(senderSocketIds)).emit('secret-message-status-updated', {
                            messageId,
                            status: 'read',
                            expiresAt: expireDate
                        });
                    }
                    
                    // Also emit to the reader so they can start their local timer
                    socket.emit('secret-message-status-updated', {
                        messageId,
                        status: 'read',
                        expiresAt: expireDate
                    });
                }
            } catch (error) {
                console.error('Error updating secret read status:', error);
            }
        });

        // 5. Hard close & Disconnect timer
        socket.on('leave-secret-conversation', (conversationId: string) => {
            socket.leave(`secret_${conversationId}`);
            socket.broadcast.to(`secret_${conversationId}`).emit('secret-chat-partner-disconnected', { conversationId });
        });

        socket.on('disconnecting', () => {
            // Check all rooms the user is in. For any secret_ room, notify others.
            socket.rooms.forEach(room => {
                if (room.startsWith('secret_')) {
                    const conversationId = room.split('_')[1];
                    socket.broadcast.to(room).emit('secret-chat-partner-disconnected', { conversationId });
                }
            });
        });

    });
};
