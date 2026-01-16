// import { IUser } from "../types";
import { Request, Response } from "express";
import User from "../models/User";

export const getUserById = async (req: Request, res: Response): Promise<Response | void> => {

    try {
        const userId = req.params.userid;
        // Assuming User is a Mongoose model
        const user = await User.findById(userId).select('-password -tokenVersion');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};