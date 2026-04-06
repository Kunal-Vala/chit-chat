"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const env_1 = require("./env");
const mongoose_1 = __importDefault(require("mongoose"));
const node_dns_1 = __importDefault(require("node:dns"));
const MONGO_CONNECT_OPTIONS = {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
};
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!env_1.MONGO_URI) {
        throw new Error('MONGO_URI is not defined in environment variables');
    }
    // Fail immediately when disconnected instead of buffering DB operations.
    mongoose_1.default.set('bufferCommands', false);
    try {
        yield mongoose_1.default.connect(`${env_1.MONGO_URI}`, MONGO_CONNECT_OPTIONS);
        console.log('MongoDB Connection Succeeded.');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('querySrv ECONNREFUSED')) {
            console.warn('Primary DNS resolver refused Mongo SRV lookup. Retrying with public DNS...');
            try {
                node_dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
                yield mongoose_1.default.connect(`${env_1.MONGO_URI}`, MONGO_CONNECT_OPTIONS);
                console.log('MongoDB Connection Succeeded (public DNS fallback).');
                return;
            }
            catch (retryErr) {
                console.error('Error in DB connection after DNS fallback:', retryErr);
                throw retryErr;
            }
        }
        console.error('Error in DB connection:', err);
        throw err;
    }
});
exports.connectDB = connectDB;
