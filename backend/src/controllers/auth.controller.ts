import { Request, Response } from 'express';
import Jwt from "jsonwebtoken";
import User from "../models/user";
import { createHash } from "../lib/password";
import { JWT_SECRET } from '../config/env';
import { IUser } from '../types';


interface SignUpBody {
    username: string;
    email: string;
    password: string;
}

export const sign_up = async (req: Request<object, object, SignUpBody>, res: Response): Promise<Response> => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = await createHash(password);

        const newUser: IUser = await User.create({
            username,
            email,
            password: hashedPassword,
            onlineStatus: false,
        });

        const token = Jwt.sign({
            userId: newUser._id.toString(),
            email: newUser.email,
        },
            JWT_SECRET,
            {
                expiresIn: '1d'
            }
        );

        return res.status(201).json({
            message: 'User Created Successfully',
            token,
            user: {
                id: newUser._id.toString(),
                username: newUser.username,
                email: newUser.email,
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
