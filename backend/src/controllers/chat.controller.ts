import { Response } from "express";
import { AuthenticatedRequest } from "../types";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import User from "../models/User";
import { error } from "node:console";

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

        res.json({ conversation });

    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
};