import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import {
    getUserConversations,
    createConversation,
    getConversation,
    getMessages,
    deleteMessage,
    editMessage,
    markConversationAsRead
} from '../controllers/chat.controller';

export const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Conversation routes
router.get('/conversations', getUserConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:conversationId', getConversation);
router.put('/conversations/:conversationId/read', markConversationAsRead);

// Message routes
router.get('/conversations/:conversationId/messages', getMessages);
router.delete('/messages/:messageId', deleteMessage);
router.put('/messages/:messageId', editMessage);

export default router;