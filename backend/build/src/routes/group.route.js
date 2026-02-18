"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const group_controller_1 = require("../controllers/group.controller");
exports.router = (0, express_1.Router)();
// All routes require authentication
exports.router.use(auth_middleware_1.authenticateUser);
// Group management routes
exports.router.post('/', group_controller_1.createGroup);
exports.router.get('/conversation/:conversationId', group_controller_1.getGroupByConversationId);
exports.router.get('/:groupId', group_controller_1.getGroupDetails);
exports.router.put('/:groupId', group_controller_1.updateGroup);
exports.router.delete('/:groupId', group_controller_1.deleteGroup);
// Member management routes
exports.router.post('/:groupId/members', group_controller_1.addMembers);
exports.router.delete('/:groupId/members/:userId', group_controller_1.removeMember);
exports.router.post('/:groupId/leave', group_controller_1.leaveGroup);
// Admin management routes
exports.router.put('/:groupId/admin', group_controller_1.transferAdmin);
// Message routes
exports.router.get('/:groupId/messages', group_controller_1.getGroupMessages);
exports.default = exports.router;
