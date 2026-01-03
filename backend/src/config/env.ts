import dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

export const MONGO_URI = process.env.MONGO_URI!;
// export const JWT_SECRET = process.env.JWT_SECRET!;