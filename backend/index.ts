import express from 'express';
import { connectDB } from './src/config/db';
import { router as UserRouter } from './src/routes/auth.route';
import { router as ChatRouter } from './src/routes/chat.route';
import cors from "cors";
import { FRONTEND } from './src/config/env';

connectDB().catch(error => {
  console.log(error);
});

const app = express();

const allowedOrigins = (FRONTEND || 'http://localhost:3001,http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((s) => s.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.use('/api/chat', ChatRouter);
app.use('/api/auth', UserRouter);

const PORT = 3000;

app.get('/ping', (_req, res) => {
  console.log('someone pinged here');
  res.send('pong');
});



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
