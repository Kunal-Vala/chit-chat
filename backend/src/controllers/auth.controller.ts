import { Request, Response } from 'express';
import Jwt from "jsonwebtoken";
import { ZodError } from 'zod';
import User from "../models/User";
import { createHash, checkPassword } from "../lib/password";
import { JWT_SECRET } from '../config/env';
import { IUser, SignInBody, AuthenticatedRequest } from '../types';
import { toSignUpInput, toSignInInput } from '../lib/validationSchema';


interface SignUpBody {
    username: string;
    email: string;
    password: string;
}

export const sign_up = async (req: Request<object, object, SignUpBody>, res: Response): Promise<Response> => {
    try {
        const { username, email, password } = toSignUpInput(req.body);

        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
        });

        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = await createHash(password);

        const newUser: IUser = await User.create({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            onlineStatus: false,
        });

        const token = Jwt.sign({
            userId: newUser._id.toString(),
            email: newUser.email,
            username: newUser.username,
            tokenVersion: newUser.tokenVersion || 0,
        },
            JWT_SECRET,
            {
                expiresIn: '7d',
                algorithm: 'HS256'
            }
        );

        return res.status(201).json({
            message: 'User Created Successfully',
            token,
            user: {
                userId: newUser._id.toString(),
                username: newUser.username,
                email: newUser.email,
            }
        });
    } catch (error) {
        if (error instanceof ZodError) {
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
};


export const sign_in = async (req: Request<object, object, SignInBody>, res: Response): Promise<Response> => {
    try {
        const { email, password } = toSignInInput(req.body);

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user || !(await checkPassword(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = Jwt.sign({
            userId: user._id.toString(),
            email: user.email,
            username: user.username,
            tokenVersion: user.tokenVersion || 0,
        },
            JWT_SECRET,
            { 
                expiresIn: '1d',
                algorithm: 'HS256'
            }
        );

        return res.status(200).json({
            message: 'Signed in successfully',
            token,
            user: {
                userId: user._id.toString(),
                username: user.username,
                email: user.email,
            }
        });
    } catch (error) {
        if (error instanceof ZodError) {
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
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Increment tokenVersion to invalidate all existing tokens
        await User.findByIdAndUpdate(req.user.userId, {
            $inc: { tokenVersion: 1 }
        });

        return res.status(200).json({ 
            message: 'Logged out successfully' 
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const refresh = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate new token
        const token = Jwt.sign(
            {
                userId: user._id.toString(),
                email: user.email,
                username: user.username,
                tokenVersion: user.tokenVersion || 0,
            },
            JWT_SECRET,
            { 
                expiresIn: '7d',
                algorithm: 'HS256'
            }
        );

        return res.status(200).json({
            message: 'Token refreshed successfully',
            token,
            user: {
                userId: user._id.toString(),
                username: user.username,
                email: user.email,
            }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const verify = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await User.findById(req.user.userId);

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
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};