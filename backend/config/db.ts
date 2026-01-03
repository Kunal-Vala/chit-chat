import { MONGO_URI } from "./env";
import mongoose from 'mongoose';


export const connectDB = async () => {
    try {
        await mongoose.connect(`${MONGO_URI}`);
        console.log('MongoDB Connection Succeeded.');
    } catch (err) {
        console.error('Error in DB connection:', err);
    }
};
