import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message";
import Conversation from "../models/Conversation";
import Group from "../models/Group";
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

        if (!token) {
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
        const username = socket.data.username;

        // store online user

        onlineUsers.set(userId, socket.id);

        // update user online status in db
        User.findByIdAndUpdate(userId, {
            onlineStatus: true,
            lastSeen: new Date(),

        }).catch(console.error);

        // Broadcast online status to friends

        socket.broadcast.emit('user-online', { userId });

        console.log(`User ${username} connected`);


        // Join Conversation Room

        socket.on('join-conversation', async (conversationId: string) => {
            await socket.join(conversationId);
            console.log(`User ${username} (ID: ${userId}) joined conversation ${conversationId}`);
        });

        // Leave conversation room
        socket.on('leave-conversation', async (conversationId: string) => {
            await socket.leave(conversationId);
            console.log(`User ${username} (ID: ${userId}) left conversation ${conversationId}`);
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
                    deliveryStatus: 'sent',
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
                const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
                socket.emit('message-error', { error: errorMessage });
            }
        });

        // Message Delivered Acknowledgment

        socket.on('message-delivered', async (messageId: string) => {
            try {
                const message = await Message.findByIdAndUpdate(
                    messageId,
                    {
                        deliveryStatus: 'delivered',
                        deliveredAt: new Date(),
                    },
                    { new: true }
                );

                if (message) {
                    // Notify sender
                    const senderSocketId = onlineUsers.get(message.senderId.toString());
                    if (senderSocketId) {
                        io.to(senderSocketId).emit('message-status-updated', {
                            messageId,
                            status: 'delivered'
                        });
                    }
                }
            } catch (error) {
                console.error('Error updating delivery status:', error);
            }
        });

        // Message read acknowledgment
        socket.on('message-read', async (messageId: string) => {
            try {
                const message = await Message.findByIdAndUpdate(
                    messageId,
                    {
                        deliveryStatus: 'read',
                        readAt: new Date(),
                        $addToSet: { readBy: userId }
                    },
                    { new: true }
                );

                if (message) {
                    // Notify sender
                    const senderSocketId = onlineUsers.get(message.senderId.toString());
                    if (senderSocketId) {
                        io.to(senderSocketId).emit('message-status-updated', {
                            messageId,
                            status: 'read'
                        });
                    }
                }
            } catch (error) {
                console.error('Error updating read status:', error);
            }
        });

        // Typing indicators
        socket.on('typing-start', (conversationId: string) => {
            console.log(`[TYPING] User ${username} (ID: ${userId}) started typing in conversation ${conversationId}`);
            socket.to(conversationId).emit('user-typing', {
                userId,
                username,
                conversationId
            });
        });

        socket.on('typing-stop', (conversationId: string) => {
            socket.to(conversationId).emit('user-stopped-typing', { 
                userId,
                conversationId
            });
        });

        // Group-related socket events

        // Join group room
        socket.on('join-group', async (groupId: string) => {
            try {
                const group = await Group.findById(groupId);
                
                if (!group) {
                    socket.emit('group-error', { error: 'Group not found' });
                    return;
                }

                // Check if user is a member
                const isMember = group.memberIds.some(id => id.toString() === userId);
                if (!isMember) {
                    socket.emit('group-error', { error: 'You are not a member of this group' });
                    return;
                }

                // Join the group's conversation room
                await socket.join(group.conversationId.toString());
                console.log(`User ${username} (ID: ${userId}) joined group ${groupId}`);
                
                socket.emit('group-joined', { groupId });
            } catch (error) {
                console.error('Error joining group:', error);
                socket.emit('group-error', { error: 'Failed to join group' });
            }
        });

        // Leave group room
        socket.on('leave-group', async (groupId: string) => {
            try {
                const group = await Group.findById(groupId);
                
                if (group) {
                    await socket.leave(group.conversationId.toString());
                    console.log(`User ${username} (ID: ${userId}) left group ${groupId}`);
                    socket.emit('group-left', { groupId });
                }
            } catch (error) {
                console.error('Error leaving group:', error);
            }
        });

        // Send group message
        socket.on('group-message', async (data: {
            groupId: string;
            content: string;
            messageType: 'text' | 'image' | 'file';
            mediaUrl?: string;
        }) => {
            try {
                const group = await Group.findById(data.groupId);

                if (!group) {
                    socket.emit('group-error', { error: 'Group not found' });
                    return;
                }

                // Check if user is a member
                const isMember = group.memberIds.some(id => id.toString() === userId);
                if (!isMember) {
                    socket.emit('group-error', { error: 'You are not a member of this group' });
                    return;
                }

                // Create message in database
                const message = await Message.create({
                    conversationId: group.conversationId,
                    senderId: userId,
                    content: data.content,
                    messageType: data.messageType,
                    mediaUrl: data.mediaUrl,
                    deliveryStatus: 'sent',
                    sentAt: new Date(),
                });

                // Populate sender info
                await message.populate('senderId', 'username profilePictureUrl');

                // Update conversation's lastMessage
                await Conversation.findByIdAndUpdate(group.conversationId, {
                    lastMessageId: message._id
                });

                // Emit to all members in the group room
                io.to(group.conversationId.toString()).emit('new-group-message', {
                    groupId: data.groupId,
                    message
                });

            } catch (error) {
                console.error('Error sending group message:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to send group message';
                socket.emit('group-error', { error: errorMessage });
            }
        });

        // Notify group when new member is added
        socket.on('member-added', async (data: { groupId: string; memberIds: string[] }) => {
            try {
                const group = await Group.findById(data.groupId);

                if (!group) {
                    socket.emit('group-error', { error: 'Group not found' });
                    return;
                }

                // Check if user is admin
                if (group.adminId.toString() !== userId) {
                    socket.emit('group-error', { error: 'Only admin can add members' });
                    return;
                }

                // Emit to group room
                io.to(group.conversationId.toString()).emit('member-added', {
                    groupId: data.groupId,
                    memberIds: data.memberIds,
                    addedBy: userId
                });

            } catch (error) {
                console.error('Error notifying member added:', error);
            }
        });

        // Notify group when member is removed
        socket.on('member-removed', async (data: { groupId: string; memberId: string }) => {
            try {
                const group = await Group.findById(data.groupId);

                if (!group) {
                    socket.emit('group-error', { error: 'Group not found' });
                    return;
                }

                // Check if user is admin
                if (group.adminId.toString() !== userId) {
                    socket.emit('group-error', { error: 'Only admin can remove members' });
                    return;
                }

                // Emit to group room
                io.to(group.conversationId.toString()).emit('member-removed', {
                    groupId: data.groupId,
                    memberId: data.memberId,
                    removedBy: userId
                });

                // Notify the removed member specifically
                const removedMemberSocketId = onlineUsers.get(data.memberId);
                if (removedMemberSocketId) {
                    io.to(removedMemberSocketId).emit('removed-from-group', {
                        groupId: data.groupId
                    });
                }

            } catch (error) {
                console.error('Error notifying member removed:', error);
            }
        });

        // Notify group of updates (name, description, picture)
        socket.on('group-updated', async (data: { 
            groupId: string; 
            updates: { name?: string; description?: string; groupPictureUrl?: string } 
        }) => {
            try {
                const group = await Group.findById(data.groupId);

                if (!group) {
                    socket.emit('group-error', { error: 'Group not found' });
                    return;
                }

                // Check if user is admin
                if (group.adminId.toString() !== userId) {
                    socket.emit('group-error', { error: 'Only admin can update group' });
                    return;
                }

                // Emit to group room
                io.to(group.conversationId.toString()).emit('group-updated', {
                    groupId: data.groupId,
                    updates: data.updates,
                    updatedBy: userId
                });

            } catch (error) {
                console.error('Error notifying group updated:', error);
            }
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            onlineUsers.delete(userId);

            // Update user offline status
            await User.findByIdAndUpdate(userId, {
                onlineStatus: false,
                lastSeen: new Date()
            }).catch(console.error);

            // Broadcast offline status
            socket.broadcast.emit('user-offline', { userId });

            console.log(`User ${username} disconnected`);
        });
    });
};

