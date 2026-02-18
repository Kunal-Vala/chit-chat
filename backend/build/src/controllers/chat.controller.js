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
exports.markConversationAsRead = exports.editMessage = exports.deleteMessage = exports.getMessages = exports.getConversation = exports.createConversation = exports.getUserConversations = void 0;
const Conversation_1 = __importDefault(require("../models/Conversation"));
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
// GET api/chat/conversation - get all user's conversation
const getUserConversations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const conversation = yield Conversation_1.default.find({
            participants: userId,
        })
            .populate('participants', 'username profilePictureUrl onlineStatus lastSeen')
            .populate({
            path: 'lastMessageId',
            select: 'content messageType sentAt senderId'
        })
            .sort({ updatedAt: -1 });
        res.json({ conversation });
    }
    catch (error) {
        console.error('Error Fetching Conversation', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});
exports.getUserConversations = getUserConversations;
// POST api/chat/conversation - create new conversation
const createConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { participantId } = req.body;
        if (!participantId) {
            return res.status(400).json({ error: 'Participant Id is required' });
        }
        const existingConversation = yield Conversation_1.default.findOne({
            conversationType: 'direct',
            participants: { $all: [userId, participantId] }
        });
        if (existingConversation) {
            return res.json({ conversation: existingConversation });
        }
        // verify both user exist
        const otherUser = yield User_1.default.findById(participantId);
        if (!otherUser) {
            return res.status(404).json({ error: 'user does not exist' });
        }
        const conversation = yield Conversation_1.default.create({
            participants: [userId, participantId],
            conversationType: 'direct'
        });
        yield conversation.populate('participants', 'username profilePictureUrl onlineStatus');
        return res.status(201).json({ conversation });
    }
    catch (error) {
        console.error('Error Creating Conversation', error);
        return res.status(500).json({ error: 'Failed To Create Conversation' });
    }
});
exports.createConversation = createConversation;
// GET api/chat/conversation/:conversationId - get specific conversation
const getConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { conversationId } = req.params;
        if (!conversationId) {
            return res.status(400).json({ error: 'Conversation Id Required' });
        }
        const conversation = yield Conversation_1.default.findOne({
            _id: conversationId,
            participants: userId,
        }).populate('participants', 'username profilePictureUrl onlineStatus lastSeen');
        if (!conversation) {
            return res.status(400).json({ error: 'Conversation not found' });
        }
        return res.json({ conversation });
    }
    catch (error) {
        console.error('Error fetching conversation:', error);
        return res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});
exports.getConversation = getConversation;
// GET /api/chat/conversations/:conversationId/messages - Get messages (paginated)
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        // verify user is part of conversation
        const conversation = yield Conversation_1.default.findOne({
            _id: conversationId,
            participants: userId,
        });
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const message = yield Message_1.default.find({
            conversationId,
            isDeleted: { $ne: true } //exclude deleted messages
        })
            .populate('senderId', 'username profilePictureUrl')
            .sort({ sentAt: -1 }) // Most recent first 
            .skip(skip)
            .limit(limitNum);
        const totalMessages = yield Message_1.default.countDocuments({
            conversationId,
            isDeleted: { $ne: true }
        });
        return res.json({
            message: message.reverse(),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalMessages,
                totalPages: Math.ceil(totalMessages / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
exports.getMessages = getMessages;
// DELETE /api/chat/messages/:messageId - Delete message
const deleteMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { messageId } = req.params;
        const message = yield Message_1.default.findOne({
            _id: messageId,
            senderId: userId // Only sender can delete
        });
        if (!message) {
            return res.status(404).json({ error: 'Message not found or unauthorized' });
        }
        // Soft delete
        message.isDeleted = true;
        message.deletedAt = new Date();
        yield message.save();
        return res.json({ message: 'Message deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting message:', error);
        return res.status(500).json({ error: 'Failed to delete message' });
    }
});
exports.deleteMessage = deleteMessage;
// PUT /api/chat/messages/:messageId - Edit message
const editMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { messageId } = req.params;
        const { content } = req.body;
        if (!(content === null || content === void 0 ? void 0 : content.trim())) {
            return res.status(400).json({ error: 'Content required' });
        }
        const message = yield Message_1.default.findOneAndUpdate({
            _id: messageId,
            senderId: userId // Only sender can edit
        }, {
            content,
            isEdited: true,
            editedAt: new Date()
        }, { new: true });
        if (!message) {
            return res.status(404).json({ error: 'Message not found or unauthorized' });
        }
        return res.json({ message });
    }
    catch (error) {
        console.error('Error editing message:', error);
        return res.status(500).json({ error: 'Failed to edit message' });
    }
});
exports.editMessage = editMessage;
// PUT /api/chat/conversations/:conversationId/read - Mark all messages as read
const markConversationAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { conversationId } = req.params;
        // Update all unread messages
        yield Message_1.default.updateMany({
            conversationId,
            senderId: { $ne: userId }, // Not sent by current user
            readBy: { $ne: userId } // Not already read
        }, {
            $addToSet: { readBy: userId },
            deliveryStatus: 'read',
            readAt: new Date()
        });
        res.json({ message: 'Conversation marked as read' });
    }
    catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});
exports.markConversationAsRead = markConversationAsRead;
