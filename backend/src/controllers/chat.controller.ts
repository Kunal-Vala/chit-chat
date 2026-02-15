import { Response } from "express";
import { AuthenticatedRequest } from "../types";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import User from "../models/User";

// GET api/chat/conversation - get all user's conversation

export const getUserConversations = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;

        const conversation = await Conversation.find({
            participants: userId,
        })
            .populate('participants', 'username profilePictureUrl onlineStatus lastSeen')
            .populate({
                path: 'lastMessageId',
                select: 'content messageType sentAt senderId'
            })
            .sort({ updatedAt: -1 });

        res.json({ conversation });
    } catch (error) {
        console.error('Error Fetching Conversation', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
};

// POST api/chat/conversation - create new conversation

export const createConversation = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { participantId } = req.body;

        if (!participantId) {
            return res.status(400).json({ error: 'Participant Id is required' });

        }

        const existingConversation = await Conversation.findOne({
            conversationType: 'direct',
            participants: { $all: [userId, participantId] }

        });

        if (existingConversation) {
            return res.json({ conversation: existingConversation });
        }

        // verify both user exist

        const otherUser = await User.findById(participantId);

        if (!otherUser) {
            return res.status(404).json({ error: 'user does not exist' });
        }

        const conversation = await Conversation.create({
            participants: [userId, participantId],
            conversationType: 'direct'

        });

        await conversation.populate('participants', 'username profilePictureUrl onlineStatus');

        return res.status(201).json({ conversation });

    } catch (error) {
        console.error('Error Creating Conversation', error);
        return res.status(500).json({ error: 'Failed To Create Conversation' });
    }
};

// GET api/chat/conversation/:conversationId - get specific conversation

export const getConversation = async (req: AuthenticatedRequest, res: Response) => {

    try {
        const userId = req.user?.userId;
        const { conversationId } = req.params;

        if (!conversationId) {
            return res.status(400).json({ error: 'Conversation Id Required' });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        }).populate('participants', 'username profilePictureUrl onlineStatus lastSeen');

        if (!conversation) {
            return res.status(400).json({ error: 'Conversation not found' });
        }

        return res.json({ conversation });

    } catch (error) {
        console.error('Error fetching conversation:', error);
        return res.status(500).json({ error: 'Failed to fetch conversation' });
    }
};

// GET /api/chat/conversations/:conversationId/messages - Get messages (paginated)

export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // verify user is part of conversation

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const message = await Message.find({
            conversationId,
            isDeleted: { $ne: true } //exclude deleted messages

        })
            .populate('senderId', 'username profilePictureUrl')
            .sort({ sentAt: -1 }) // Most recent first 
            .skip(skip)
            .limit(limitNum);

        const totalMessages = await Message.countDocuments({
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
    } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

// DELETE /api/chat/messages/:messageId - Delete message
export const deleteMessage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { messageId } = req.params;

        const message = await Message.findOne({
            _id: messageId,
            senderId: userId // Only sender can delete
        });

        if (!message) {
            return res.status(404).json({ error: 'Message not found or unauthorized' });
        }

        // Soft delete
        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();

        return res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        return res.status(500).json({ error: 'Failed to delete message' });
    }
};

// PUT /api/chat/messages/:messageId - Edit message
export const editMessage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { messageId } = req.params;
        const { content } = req.body;

        if (!content?.trim()) {
            return res.status(400).json({ error: 'Content required' });
        }

        const message = await Message.findOneAndUpdate(
            {
                _id: messageId,
                senderId: userId // Only sender can edit
            },
            {
                content,
                isEdited: true,
                editedAt: new Date()
            },
            { new: true }
        );

        if (!message) {
             return res.status(404).json({ error: 'Message not found or unauthorized' });
        }

        return res.json({ message });
    } catch (error) {
        console.error('Error editing message:', error);
        return res.status(500).json({ error: 'Failed to edit message' });
    }
};

// PUT /api/chat/conversations/:conversationId/read - Mark all messages as read
export const markConversationAsRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { conversationId } = req.params;

        // Update all unread messages
        await Message.updateMany(
            {
                conversationId,
                senderId: { $ne: userId }, // Not sent by current user
                readBy: { $ne: userId } // Not already read
            },
            {
                $addToSet: { readBy: userId },
                deliveryStatus: 'read',
                readAt: new Date()
            }
        );

        res.json({ message: 'Conversation marked as read' });
    } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
};