import express from 'express';
import { connectDB } from './src/config/db';
import { router as AuthRouter } from './src/routes/auth.route';
import { router as ChatRouter } from './src/routes/chat.route';
import { router as UserRouter } from './src/routes/user.route';
import { router as GroupRouter } from './src/routes/group.route';
import cors from "cors";
import { FRONTEND } from './src/config/env';
import { createServer } from 'http';
import { Server } from "socket.io";
import { setupChatHandlers } from './src/socket/chatHandler';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './src/swagger';


const app = express();
const httpServer = createServer(app);

const allowedOrigins = (FRONTEND || 'http://localhost:3001,http://localhost:5173,http://localhost:4173,http://127.0.0.1:3000')
  .split(',')
  .map((s) => s.trim());


const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  }
});

// Middleware
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Chit-Chat API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// Routes
app.use('/api/chat', ChatRouter);
app.use('/api/auth', AuthRouter);
app.use('/api/user', UserRouter);
app.use('/api/groups', GroupRouter);

// Socket.io Connection Handling
setupChatHandlers(io);

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});