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



export const sendFriendRequest = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const currentUserId = req.user?.userId;
        const { targetUserId } = req.body;

        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!targetUserId) {
            return res.status(400).json({ error: 'Target user ID is required' });
        }

        if (!targetUserId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: 'Invalid target user ID format' });
        }

        if (currentUserId === targetUserId) {
            return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
        }

        // Check if target user exists
        const targetUserExists = await User.findById(targetUserId);
        if (!targetUserExists) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        // Check if already friends
        const alreadyFriends = await User.findOne({
            _id: currentUserId,
            friends: targetUserId
        });

        if (alreadyFriends) {
            return res.status(400).json({ error: 'You are already friends with this user' });
        }

        // Check if request already pending
        const existingRequest = await User.findOne({
            _id: targetUserId,
            'friendRequests.from': currentUserId,
            'friendRequests.status': 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ error: 'Friend request already sent and pending' });
        }

        const targetUser = await User.findByIdAndUpdate(
            targetUserId,
            {
                $push: {
                    friendRequests: {
                        from: currentUserId,
                        status: 'pending',
                    }
                }
            },
            { new: true }
        ).select('-password -tokenVersion');

        return res.status(200).json({
            message: 'Friend request sent successfully',
            user: targetUser,
            friendRequest: {
                from: currentUserId,
                to: targetUserId,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Error sending friend request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


export const acceptFriendRequest = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const currentUserId = req.user?.userId;
        const { requesterId } = req.body; // Changed from requestId to requesterId for clarity

        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!requesterId) {
            return res.status(400).json({ error: 'Requester ID is required' });
        }

        if (!requesterId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: 'Invalid requester ID format' });
        }

        // Verify the friend request actually exists before accepting
        const currentUser = await User.findById(currentUserId);
        const friendRequestExists = currentUser?.friendRequests?.some(
            req => req.from.toString() === requesterId && req.status === 'pending'
        );

        if (!friendRequestExists) {
            return res.status(404).json({ error: 'Friend request not found or already processed' });
        }

        // Check if requester still exists
        const requesterExists = await User.findById(requesterId);
        if (!requesterExists) {
            return res.status(404).json({ error: 'Requester user not found' });
        }

        // Accept the request - remove from friendRequests and add to friends
        const updatedCurrentUser = await User.findByIdAndUpdate(
            currentUserId,
            {
                $pull: { friendRequests: { from: requesterId, status: 'pending' } },
                $addToSet: { friends: requesterId } // $addToSet prevents duplicates
            },
            { new: true }
        ).select('-password -tokenVersion');

        // Add current user to requester's friends
        await User.findByIdAndUpdate(
            requesterId,
            {
                $addToSet: { friends: currentUserId }
            }
        );

        return res.status(200).json({
            message: 'Friend request accepted successfully',
            user: updatedCurrentUser
        });

    } catch (error) {
        console.error('Error accepting friend request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const rejectFriendRequest = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const currentUserId = req.user?.userId;
        const { requesterId } = req.body; // Changed from requestId to requesterId

        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!requesterId) {
            return res.status(400).json({ error: 'Requester ID is required' });
        }

        if (!requesterId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: 'Invalid requester ID format' });
        }

        // Verify the friend request exists before rejecting
        const currentUser = await User.findById(currentUserId);
        const friendRequestExists = currentUser?.friendRequests?.some(
            req => req.from.toString() === requesterId && req.status === 'pending'
        );

        if (!friendRequestExists) {
            return res.status(404).json({ error: 'Friend request not found or already processed' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            currentUserId,
            {
                $pull: { friendRequests: { from: requesterId, status: 'pending' } }
            },
            { new: true }
        ).select('-password -tokenVersion');

        return res.status(200).json({
            message: 'Friend request rejected successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteFriend = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const currentUserId = req.user?.userId;
        const { friendId } = req.body;

        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!friendId) {
            return res.status(400).json({ error: 'Friend ID is required' });
        }

        if (!friendId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: 'Invalid friend ID format' });
        }

        if (currentUserId === friendId) {
            return res.status(400).json({ error: 'You cannot remove yourself as a friend' });
        }

        // Verify friendship actually exists before deletion
        const currentUser = await User.findById(currentUserId);
        const friendshipExists = currentUser?.friends?.includes(friendId);

        if (!friendshipExists) {
            return res.status(404).json({ error: 'Friendship not found' });
        }

        // Check if friend user exists
        const friendExists = await User.findById(friendId);
        if (!friendExists) {
            return res.status(404).json({ error: 'Friend user not found' });
        }

        // Remove friend from both users' lists
        const updatedCurrentUser = await User.findByIdAndUpdate(
            currentUserId,
            {
                $pull: { friends: friendId }
            },
            { new: true }
        ).select('-password -tokenVersion');

        await User.findByIdAndUpdate(
            friendId,
            {
                $pull: { friends: currentUserId }
            }
        );

        return res.status(200).json({
            message: 'Friend deleted successfully',
            user: updatedCurrentUser
        });

    } catch (error) {
        console.error('Error deleting friend:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};