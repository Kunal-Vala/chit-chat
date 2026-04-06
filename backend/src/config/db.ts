import { MONGO_URI } from "./env";
import mongoose from 'mongoose';
import dns from 'node:dns';

const MONGO_CONNECT_OPTIONS = {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
};


export const connectDB = async () => {
    if (!MONGO_URI) {
        throw new Error('MONGO_URI is not defined in environment variables');
    }

    // Fail immediately when disconnected instead of buffering DB operations.
    mongoose.set('bufferCommands', false);

    try {
        await mongoose.connect(`${MONGO_URI}`, MONGO_CONNECT_OPTIONS);
        console.log('MongoDB Connection Succeeded.');
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        if (message.includes('querySrv ECONNREFUSED')) {
            console.warn('Primary DNS resolver refused Mongo SRV lookup. Retrying with public DNS...');

            try {
                dns.setServers(['8.8.8.8', '1.1.1.1']);
                await mongoose.connect(`${MONGO_URI}`, MONGO_CONNECT_OPTIONS);
                console.log('MongoDB Connection Succeeded (public DNS fallback).');
                return;
            } catch (retryErr) {
                console.error('Error in DB connection after DNS fallback:', retryErr);
                throw retryErr;
            }
        }

        console.error('Error in DB connection:', err);
        throw err;
    }
};
