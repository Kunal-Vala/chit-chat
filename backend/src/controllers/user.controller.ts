import { AuthenticatedRequest } from "../types";
import { Request, Response } from "express";
import User from "../models/User";
import { ZodError } from "zod";
import { toUpdateProfileInput } from "../lib/validationSchema";
import { uploadBufferToCloudinary, downloadAndUploadToCloudinary, extractPublicIdFromUrl, deleteFromCloudinary } from "../lib/cloudinary";

export const getUserById = async (req: Request, res: Response): Promise<Response | void> => {

    try {
        const userId = req.params.userid;
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

export const uploadProfilePicture = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.params.userid;

        // Verify the user is uploading their own picture
        if (req.user?.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You can only upload your own profile picture' });
        }

        // Log for debugging
        console.log('File upload attempt:', {
            hasFile: !!req.file,
            bodyKeys: Object.keys(req.body),
            fileInfo: req.file ? {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            } : 'No file'
        });

        // Check if file exists
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No file provided or invalid file type',
                allowedTypes: 'JPEG, JPG, PNG, GIF, WebP, SVG, BMP',
                hint: 'Make sure the field name is "profilePicture" and the file is an image'
            });
        }

        // Get current user to find old Cloudinary image for deletion
        const currentUser = await User.findById(userId);
        const oldCloudinaryUrl = currentUser?.profilePictureUrl;

        // Upload buffer to Cloudinary
        const cloudinaryUrl = await uploadBufferToCloudinary(req.file.buffer, 'profile-pictures');

        // Update user with new profile picture URL
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { profilePictureUrl: cloudinaryUrl } },
            { new: true, runValidators: true }
        ).select('-password -tokenVersion');

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete old image from Cloudinary if it exists
        if (oldCloudinaryUrl && oldCloudinaryUrl.includes('cloudinary.com')) {
            const publicId = extractPublicIdFromUrl(oldCloudinaryUrl);
            if (publicId) {
                await deleteFromCloudinary(publicId);
            }
        }

        return res.status(200).json({
            message: 'Profile picture uploaded successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        return res.status(400).json({
            error: 'Failed to upload profile picture',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const searchUsersByUsername = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { q } = req.query;
        
        if (!q || typeof q !== 'string' || q.trim() === '') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
        const skip = Math.max(parseInt(req.query.skip as string) || 0, 0);

        const users = await User.find({
            username: { $regex: q.trim(), $options: 'i' }
        })
            .select('-password -tokenVersion -email')
            .limit(limit)
            .skip(skip)
            .lean();

        const total = await User.countDocuments({
            username: { $regex: q.trim(), $options: 'i' }
        });

        return res.status(200).json({
            users,
            total,
            limit,
            skip
        });
    } catch (error) {
        console.error('Error searching users:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.params.userid;
        const updateData = toUpdateProfileInput(req.body);

        // Verify the user is updating their own profile
        if (req.user?.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You can only update your own profile' });
        }

        // Build update object with only provided fields
        const profileUpdate: Partial<{ username: string; statusText: string; profilePictureUrl: string }> = {};
        
        if (updateData.username !== undefined) profileUpdate.username = updateData.username;
        if (updateData.statusText !== undefined) profileUpdate.statusText = updateData.statusText;

        // Handle profile picture from URL or base64
        if (updateData.profilePictureUrl !== undefined) {
            try {
                // Get current user to find old Cloudinary image for deletion
                const currentUser = await User.findById(userId);
                const oldCloudinaryUrl = currentUser?.profilePictureUrl;

                let cloudinaryUrl: string;

                // Check if it's a URL or base64
                if (updateData.profilePictureUrl.startsWith('http://') || updateData.profilePictureUrl.startsWith('https://')) {
                    // Download from URL and upload to Cloudinary
                    cloudinaryUrl = await downloadAndUploadToCloudinary(updateData.profilePictureUrl);
                } else if (updateData.profilePictureUrl.startsWith('data:image/')) {
                    // Handle base64 data URL
                    const base64Data = updateData.profilePictureUrl.replace(/^data:image\/[a-z]+;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');
                    cloudinaryUrl = await uploadBufferToCloudinary(buffer);
                } else {
                    return res.status(400).json({ error: 'Invalid profile picture format. Provide URL or base64 data URI.' });
                }

                profileUpdate.profilePictureUrl = cloudinaryUrl;

                // Delete old image from Cloudinary if it exists
                if (oldCloudinaryUrl && oldCloudinaryUrl.includes('cloudinary.com')) {
                    const publicId = extractPublicIdFromUrl(oldCloudinaryUrl);
                    if (publicId) {
                        await deleteFromCloudinary(publicId);
                    }
                }
            } catch (error) {
                console.error('Error processing profile picture:', error);
                return res.status(400).json({
                    error: 'Failed to process profile picture',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        // Check if username is already taken (if username is being updated)
        if (profileUpdate.username) {
            const existingUser = await User.findOne({ username: profileUpdate.username, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(409).json({ error: 'Username is already taken' });
            }
        }

        // Ensure at least one field is being updated
        if (Object.keys(profileUpdate).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: profileUpdate },
            { new: true, runValidators: true }
        ).select('-password -tokenVersion');

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({ 
            message: 'Profile updated successfully',
            user: updatedUser 
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        if (error instanceof ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.issues.map(issue => ({
                        field: issue.path.join('.'),
                        message: issue.message
                    }))
                });
            }
        if ((error as { code?: number }).code === 11000) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
};