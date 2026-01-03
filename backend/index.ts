import express from 'express';
import { connectDB } from './src/config/db';

connectDB().catch(error => {
  console.log(error);
});

const app = express();


app.use(express.json());

const PORT = 3000;

app.get('/ping', (_req, res) => {
  console.log('someone pinged here');
  res.send('pong');
});



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
