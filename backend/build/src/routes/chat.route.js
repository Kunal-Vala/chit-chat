"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const chat_controller_1 = require("../controllers/chat.controller");
exports.router = (0, express_1.Router)();
// All routes require authentication
exports.router.use(auth_middleware_1.authenticateUser);
// Conversation routes
exports.router.get('/conversations', chat_controller_1.getUserConversations);
exports.router.post('/conversations', chat_controller_1.createConversation);
exports.router.get('/conversations/:conversationId', chat_controller_1.getConversation);
exports.router.put('/conversations/:conversationId/read', chat_controller_1.markConversationAsRead);
// Message routes
exports.router.get('/conversations/:conversationId/messages', chat_controller_1.getMessages);
exports.router.delete('/messages/:messageId', chat_controller_1.deleteMessage);
exports.router.put('/messages/:messageId', chat_controller_1.editMessage);
exports.default = exports.router;
