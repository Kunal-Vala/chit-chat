import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import {
    createGroup,
    getGroupDetails,
    getGroupByConversationId,
    updateGroup,
    deleteGroup,
    addMembers,
    removeMember,
    leaveGroup,
    transferAdmin,
    getGroupMessages
} from '../controllers/group.controller';

export const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Group management routes
router.post('/', createGroup);
router.get('/conversation/:conversationId', getGroupByConversationId);
router.get('/:groupId', getGroupDetails);
router.put('/:groupId', updateGroup);
router.delete('/:groupId', deleteGroup);

// Member management routes
router.post('/:groupId/members', addMembers);
router.delete('/:groupId/members/:userId', removeMember);
router.post('/:groupId/leave', leaveGroup);

// Admin management routes
router.put('/:groupId/admin', transferAdmin);

// Message routes
router.get('/:groupId/messages', getGroupMessages);

export default router;
