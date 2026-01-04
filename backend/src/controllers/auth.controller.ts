import { Request, Response } from 'express';
import Jwt from "jsonwebtoken";
import { ZodError } from 'zod';
import User from "../models/User";
import { createHash, checkPassword } from "../lib/password";
import { JWT_SECRET } from '../config/env';
import { IUser, SignInBody } from '../types';
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
        },
            JWT_SECRET,
            {
                expiresIn: '1d',
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