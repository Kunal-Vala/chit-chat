"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupChatHandlers = exports.getOnlineUsers = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Message_1 = __importDefault(require("../models/Message"));
const Conversation_1 = __importDefault(require("../models/Conversation"));
const Group_1 = __importDefault(require("../models/Group"));
const User_1 = __importDefault(require("../models/User"));
const env_1 = require("../config/env");
// Store online users: userId -> socketId
const onlineUsers = new Map();
const getOnlineUsers = () => {
    return Array.from(onlineUsers.keys());
};
exports.getOnlineUsers = getOnlineUsers;
const setupChatHandlers = (io) => {
    // Socket.io middleware for Authentication 
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication Failed"));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.JWT_SECRET);
            socket.data.userId = decoded.userId;
            socket.data.username = decoded.username;
            next();
        }
        catch (err) {
            next(new Error(err + "Authentication Error"));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        const username = socket.data.username;
        // store online user
        onlineUsers.set(userId, socket.id);
        // update user online status in db
        User_1.default.findByIdAndUpdate(userId, {
            onlineStatus: true,
            lastSeen: new Date(),
        }).catch(console.error);
        // Broadcast online status to friends
        socket.broadcast.emit('user-online', { userId });
        console.log(`User ${username} connected`);
        // Join Conversation Room
        socket.on('join-conversation', (conversationId) => __awaiter(void 0, void 0, void 0, function* () {
            yield socket.join(conversationId);
            console.log(`User ${username} (ID: ${userId}) joined conversation ${conversationId}`);
        }));
        // Leave conversation room
        socket.on('leave-conversation', (conversationId) => __awaiter(void 0, void 0, void 0, function* () {
            yield socket.leave(conversationId);
            console.log(`User ${username} (ID: ${userId}) left conversation ${conversationId}`);
        }));
        // send message
        socket.on('send-message', (data) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                // create message in database
                const message = yield Message_1.default.create({
                    conversationId: data.conversationId,
                    senderId: userId,
                    content: data.content,
                    messageType: data.messageType,
                    mediaUrl: data.mediaUrl,
                    deliveryStatus: 'sent',
                    sentAt: new Date(),
                });
                // Populate sender info
                yield message.populate('senderId', 'username profilePictureUrl');
                // Update conversation's lastMessage
                yield Conversation_1.default.findByIdAndUpdate(data.conversationId, {
                    lastMessageId: message._id
                });
                // emit conversation room
                io.to(data.conversationId).emit('new-message', message);
                // Get conversation participants
                const conversation = yield Conversation_1.default.findById(data.conversationId);
                if (conversation) {
                    // mark as delivered for online users
                    const otherParticipants = conversation.participants.filter(p => p.toString() !== userId);
                    otherParticipants.forEach(participateId => {
                        const recipientSocketId = onlineUsers.get(participateId.toString());
                        if (recipientSocketId) {
                            // update delivery status
                            Message_1.default.findByIdAndUpdate(message._id, {
                                deliveryStatus: 'delivered',
                                deliveredAt: new Date(),
                            }).catch(console.error);
                        }
                    });
                }
            }
            catch (error) {
                console.error('Error sending message:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
                socket.emit('message-error', { error: errorMessage });
            }
        }));
        // Message Delivered Acknowledgment
        socket.on('message-delivered', (messageId) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const message = yield Message_1.default.findByIdAndUpdate(messageId, {
                    deliveryStatus: 'delivered',
                    deliveredAt: new Date(),
                }, { new: true });
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
            }
            catch (error) {
                console.error('Error updating delivery status:', error);
            }
        }));
        // Message read acknowledgment
        socket.on('message-read', (messageId) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const message = yield Message_1.default.findByIdAndUpdate(messageId, {
                    deliveryStatus: 'read',
                    readAt: new Date(),
                    $addToSet: { readBy: userId }
                }, { new: true });
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
            }
            catch (error) {
                console.error('Error updating read status:', error);
            }
        }));
        // Typing indicators
        socket.on('typing-start', (conversationId) => {
            console.log(`[TYPING] User ${username} (ID: ${userId}) started typing in conversation ${conversationId}`);
            socket.to(conversationId).emit('user-typing', {
                userId,
                username,
                conversationId
            });
        });
        socket.on('typing-stop', (conversationId) => {
            socket.to(conversationId).emit('user-stopped-typing', {
                userId,
                conversationId
            });
        });
        // Group-related socket events
        // Join group room
        socket.on('join-group', (groupId) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const group = yield Group_1.default.findById(groupId);
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
                yield socket.join(group.conversationId.toString());
                console.log(`User ${username} (ID: ${userId}) joined group ${groupId}`);
                socket.emit('group-joined', { groupId });
            }
            catch (error) {
                console.error('Error joining group:', error);
                socket.emit('group-error', { error: 'Failed to join group' });
            }
        }));
        // Leave group room
        socket.on('leave-group', (groupId) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const group = yield Group_1.default.findById(groupId);
                if (group) {
                    yield socket.leave(group.conversationId.toString());
                    console.log(`User ${username} (ID: ${userId}) left group ${groupId}`);
                    socket.emit('group-left', { groupId });
                }
            }
            catch (error) {
                console.error('Error leaving group:', error);
            }
        }));
        // Send group message
        socket.on('group-message', (data) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const group = yield Group_1.default.findById(data.groupId);
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
                const message = yield Message_1.default.create({
                    conversationId: group.conversationId,
                    senderId: userId,
                    content: data.content,
                    messageType: data.messageType,
                    mediaUrl: data.mediaUrl,
                    deliveryStatus: 'sent',
                    sentAt: new Date(),
                });
                // Populate sender info
                yield message.populate('senderId', 'username profilePictureUrl');
                // Update conversation's lastMessage
                yield Conversation_1.default.findByIdAndUpdate(group.conversationId, {
                    lastMessageId: message._id
                });
                // Emit to all members in the group room
                io.to(group.conversationId.toString()).emit('new-group-message', {
                    groupId: data.groupId,
                    message
                });
            }
            catch (error) {
                console.error('Error sending group message:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to send group message';
                socket.emit('group-error', { error: errorMessage });
            }
        }));
        // Notify group when new member is added
        socket.on('member-added', (data) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const group = yield Group_1.default.findById(data.groupId);
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
            }
            catch (error) {
                console.error('Error notifying member added:', error);
            }
        }));
        // Notify group when member is removed
        socket.on('member-removed', (data) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const group = yield Group_1.default.findById(data.groupId);
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
            }
            catch (error) {
                console.error('Error notifying member removed:', error);
            }
        }));
        // Notify group of updates (name, description, picture)
        socket.on('group-updated', (data) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const group = yield Group_1.default.findById(data.groupId);
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
            }
            catch (error) {
                console.error('Error notifying group updated:', error);
            }
        }));
        // Handle disconnection
        socket.on('disconnect', () => __awaiter(void 0, void 0, void 0, function* () {
            onlineUsers.delete(userId);
            // Update user offline status
            yield User_1.default.findByIdAndUpdate(userId, {
                onlineStatus: false,
                lastSeen: new Date()
            }).catch(console.error);
            // Broadcast offline status
            socket.broadcast.emit('user-offline', { userId });
            console.log(`User ${username} disconnected`);
        }));
    });
};
exports.setupChatHandlers = setupChatHandlers;
