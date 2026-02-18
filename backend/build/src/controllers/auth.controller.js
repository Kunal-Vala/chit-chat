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
exports.verify = exports.refresh = exports.logout = exports.sign_in = exports.sign_up = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const User_1 = __importDefault(require("../models/User"));
const password_1 = require("../lib/password");
const env_1 = require("../config/env");
const validationSchema_1 = require("../lib/validationSchema");
const sign_up = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password } = (0, validationSchema_1.toSignUpInput)(req.body);
        const existingUser = yield User_1.default.findOne({
            $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
        });
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }
        const hashedPassword = yield (0, password_1.createHash)(password);
        const newUser = yield User_1.default.create({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            onlineStatus: false,
        });
        const token = jsonwebtoken_1.default.sign({
            userId: newUser._id.toString(),
            email: newUser.email,
            username: newUser.username,
            tokenVersion: newUser.tokenVersion || 0,
        }, env_1.JWT_SECRET, {
            expiresIn: '7d',
            algorithm: 'HS256'
        });
        return res.status(201).json({
            message: 'User Created Successfully',
            token,
            user: {
                userId: newUser._id.toString(),
                username: newUser.username,
                email: newUser.email,
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
        }
        console.error('Signup error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.sign_up = sign_up;
const sign_in = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = (0, validationSchema_1.toSignInInput)(req.body);
        const user = yield User_1.default.findOne({ email: email.toLowerCase() });
        if (!user || !(yield (0, password_1.checkPassword)(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user._id.toString(),
            email: user.email,
            username: user.username,
            tokenVersion: user.tokenVersion || 0,
        }, env_1.JWT_SECRET, {
            expiresIn: '7d',
            algorithm: 'HS256'
        });
        return res.status(200).json({
            message: 'Signed in successfully',
            token,
            user: {
                userId: user._id.toString(),
                username: user.username,
                email: user.email,
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
        }
        console.error('Signin error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.sign_in = sign_in;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Increment tokenVersion to invalidate all existing tokens
        yield User_1.default.findByIdAndUpdate(req.user.userId, {
            $inc: { tokenVersion: 1 }
        });
        return res.status(200).json({
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.logout = logout;
const refresh = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = yield User_1.default.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Generate new token
        const token = jsonwebtoken_1.default.sign({
            userId: user._id.toString(),
            email: user.email,
            username: user.username,
            tokenVersion: user.tokenVersion || 0,
        }, env_1.JWT_SECRET, {
            expiresIn: '7d',
            algorithm: 'HS256'
        });
        return res.status(200).json({
            message: 'Token refreshed successfully',
            token,
            user: {
                userId: user._id.toString(),
                username: user.username,
                email: user.email,
            }
        });
    }
    catch (error) {
        console.error('Token refresh error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.refresh = refresh;
const verify = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = yield User_1.default.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({
            valid: true,
            user: {
                userId: user._id.toString(),
                username: user.username,
                email: user.email,
                onlineStatus: user.onlineStatus,
            }
        });
    }
    catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.verify = verify;
