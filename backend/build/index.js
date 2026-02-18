"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("./src/config/db");
const auth_route_1 = require("./src/routes/auth.route");
const chat_route_1 = require("./src/routes/chat.route");
const user_route_1 = require("./src/routes/user.route");
const group_route_1 = require("./src/routes/group.route");
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./src/config/env");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const chatHandler_1 = require("./src/socket/chatHandler");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const allowedOrigins = (env_1.FRONTEND || 'http://localhost:3001,http://localhost:5173,http://localhost:4173,http://127.0.0.1:3000')
    .split(',')
    .map((s) => s.trim());
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    }
});
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/chat', chat_route_1.router);
app.use('/api/auth', auth_route_1.router);
app.use('/api/user', user_route_1.router);
app.use('/api/groups', group_route_1.router);
// Socket.io Connection Handling
(0, chatHandler_1.setupChatHandlers)(io);
// Start server
const PORT = process.env.PORT || 5000;
(0, db_1.connectDB)().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
});
