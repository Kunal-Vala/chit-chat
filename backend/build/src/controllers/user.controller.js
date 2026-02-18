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
exports.checkFriendshipStatus = exports.getFriendRequests = exports.getFriendsList = exports.deleteFriend = exports.rejectFriendRequest = exports.acceptFriendRequest = exports.sendFriendRequest = exports.updateUserProfile = exports.searchUsersByUsername = exports.deleteProfilePicture = exports.uploadProfilePicture = exports.getUserById = void 0;
const User_1 = __importDefault(require("../models/User"));
const zod_1 = require("zod");
const validationSchema_1 = require("../lib/validationSchema");
const cloudinary_1 = require("../lib/cloudinary");
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userid;
        const user = yield User_1.default.findById(userId).select('-password -tokenVersion');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ user });
    }
    catch (error) {
        console.error('Error fetching user by ID:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getUserById = getUserById;
const uploadProfilePicture = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.params.userid;
        // Verify the user is uploading their own picture
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) !== userId) {
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
        const currentUser = yield User_1.default.findById(userId);
        const oldCloudinaryUrl = currentUser === null || currentUser === void 0 ? void 0 : currentUser.profilePictureUrl;
        // Upload buffer to Cloudinary
        const cloudinaryUrl = yield (0, cloudinary_1.uploadBufferToCloudinary)(req.file.buffer, 'profile-pictures');
        // Update user with new profile picture URL
        const updatedUser = yield User_1.default.findByIdAndUpdate(userId, { $set: { profilePictureUrl: cloudinaryUrl } }, { new: true, runValidators: true }).select('-password -tokenVersion');
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Delete old image from Cloudinary if it exists
        if (oldCloudinaryUrl && oldCloudinaryUrl.includes('cloudinary.com')) {
            const publicId = (0, cloudinary_1.extractPublicIdFromUrl)(oldCloudinaryUrl);
            if (publicId) {
                yield (0, cloudinary_1.deleteFromCloudinary)(publicId);
            }
        }
        return res.status(200).json({
            message: 'Profile picture uploaded successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Error uploading profile picture:', error);
        return res.status(400).json({
            error: 'Failed to upload profile picture',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.uploadProfilePicture = uploadProfilePicture;
const deleteProfilePicture = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.params.userid;
        // Verify the user is deleting their own picture
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) !== userId) {
            return res.status(403).json({ error: 'Unauthorized: You can only delete your own profile picture' });
        }
        // Get current user to find Cloudinary image for deletion
        const currentUser = yield User_1.default.findById(userId);
        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        const oldCloudinaryUrl = currentUser.profilePictureUrl;
        // Update user to remove profile picture URL
        const updatedUser = yield User_1.default.findByIdAndUpdate(userId, { $unset: { profilePictureUrl: '' } }, { new: true, runValidators: true }).select('-password -tokenVersion');
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Delete old image from Cloudinary if it exists
        if (oldCloudinaryUrl && oldCloudinaryUrl.includes('cloudinary.com')) {
            const publicId = (0, cloudinary_1.extractPublicIdFromUrl)(oldCloudinaryUrl);
            if (publicId) {
                yield (0, cloudinary_1.deleteFromCloudinary)(publicId);
            }
        }
        return res.status(200).json({
            message: 'Profile picture deleted successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Error deleting profile picture:', error);
        return res.status(400).json({
            error: 'Failed to delete profile picture',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.deleteProfilePicture = deleteProfilePicture;
const searchUsersByUsername = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string' || q.trim() === '') {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = Math.max(parseInt(req.query.skip) || 0, 0);
        const users = yield User_1.default.find({
            username: { $regex: q.trim(), $options: 'i' }
        })
            .select('-password -tokenVersion -email')
            .limit(limit)
            .skip(skip)
            .lean();
        const total = yield User_1.default.countDocuments({
            username: { $regex: q.trim(), $options: 'i' }
        });
        return res.status(200).json({
            users,
            total,
            limit,
            skip
        });
    }
    catch (error) {
        console.error('Error searching users:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.searchUsersByUsername = searchUsersByUsername;
const updateUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.params.userid;
        const updateData = (0, validationSchema_1.toUpdateProfileInput)(req.body);
        // Verify the user is updating their own profile
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) !== userId) {
            return res.status(403).json({ error: 'Forbidden: You can only update your own profile' });
        }
        // Build update object with only provided fields
        const profileUpdate = {};
        if (updateData.username !== undefined)
            profileUpdate.username = updateData.username;
        if (updateData.statusText !== undefined)
            profileUpdate.statusText = updateData.statusText;
        // Handle profile picture from URL or base64
        if (updateData.profilePictureUrl !== undefined) {
            try {
                // Get current user to find old Cloudinary image for deletion
                const currentUser = yield User_1.default.findById(userId);
                const oldCloudinaryUrl = currentUser === null || currentUser === void 0 ? void 0 : currentUser.profilePictureUrl;
                let cloudinaryUrl;
                // Check if it's a URL or base64
                if (updateData.profilePictureUrl.startsWith('http://') || updateData.profilePictureUrl.startsWith('https://')) {
                    // Download from URL and upload to Cloudinary
                    cloudinaryUrl = yield (0, cloudinary_1.downloadAndUploadToCloudinary)(updateData.profilePictureUrl);
                }
                else if (updateData.profilePictureUrl.startsWith('data:image/')) {
                    // Handle base64 data URL
                    const base64Data = updateData.profilePictureUrl.replace(/^data:image\/[a-z]+;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');
                    cloudinaryUrl = yield (0, cloudinary_1.uploadBufferToCloudinary)(buffer);
                }
                else {
                    return res.status(400).json({ error: 'Invalid profile picture format. Provide URL or base64 data URI.' });
                }
                profileUpdate.profilePictureUrl = cloudinaryUrl;
                // Delete old image from Cloudinary if it exists
                if (oldCloudinaryUrl && oldCloudinaryUrl.includes('cloudinary.com')) {
                    const publicId = (0, cloudinary_1.extractPublicIdFromUrl)(oldCloudinaryUrl);
                    if (publicId) {
                        yield (0, cloudinary_1.deleteFromCloudinary)(publicId);
                    }
                }
            }
            catch (error) {
                console.error('Error processing profile picture:', error);
                return res.status(400).json({
                    error: 'Failed to process profile picture',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        // Check if username is already taken (if username is being updated)
        if (profileUpdate.username) {
            const existingUser = yield User_1.default.findOne({ username: profileUpdate.username, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(409).json({ error: 'Username is already taken' });
            }
        }
        // Ensure at least one field is being updated
        if (Object.keys(profileUpdate).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        const updatedUser = yield User_1.default.findByIdAndUpdate(userId, { $set: profileUpdate }, { new: true, runValidators: true }).select('-password -tokenVersion');
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        if (error instanceof zod_1.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
        }
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateUserProfile = updateUserProfile;
const sendFriendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
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
        const targetUserExists = yield User_1.default.findById(targetUserId);
        if (!targetUserExists) {
            return res.status(404).json({ error: 'Target user not found' });
        }
        // Check if already friends
        const alreadyFriends = yield User_1.default.findOne({
            _id: currentUserId,
            friends: targetUserId
        });
        if (alreadyFriends) {
            return res.status(400).json({ error: 'You are already friends with this user' });
        }
        // Check if request already sent by current user to target user
        const existingRequest = yield User_1.default.findOne({
            _id: targetUserId,
            'friendRequests.from': currentUserId,
            'friendRequests.status': 'pending'
        });
        if (existingRequest) {
            return res.status(400).json({ error: 'Friend request already sent and pending' });
        }
        // Check if target user has already sent a request to current user (mutual interest)
        const currentUser = yield User_1.default.findById(currentUserId);
        const incomingRequest = (_b = currentUser === null || currentUser === void 0 ? void 0 : currentUser.friendRequests) === null || _b === void 0 ? void 0 : _b.find(req => req.from.toString() === targetUserId && req.status === 'pending');
        // If there's a pending request from target user, accept it automatically (mutual interest)
        if (incomingRequest) {
            // Add each other as friends
            yield User_1.default.findByIdAndUpdate(currentUserId, {
                $push: { friends: targetUserId },
                $pull: { friendRequests: { from: targetUserId, status: 'pending' } }
            });
            yield User_1.default.findByIdAndUpdate(targetUserId, {
                $push: { friends: currentUserId }
            });
            return res.status(200).json({
                message: 'Mutual friend request detected. You are now friends!',
                status: 'friends'
            });
        }
        // No existing relationship, send new friend request
        const targetUser = yield User_1.default.findByIdAndUpdate(targetUserId, {
            $push: {
                friendRequests: {
                    from: currentUserId,
                    status: 'pending',
                }
            }
        }, { new: true }).select('-password -tokenVersion');
        return res.status(200).json({
            message: 'Friend request sent successfully',
            user: targetUser,
            friendRequest: {
                from: currentUserId,
                to: targetUserId,
                status: 'pending'
            }
        });
    }
    catch (error) {
        console.error('Error sending friend request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.sendFriendRequest = sendFriendRequest;
const acceptFriendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
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
        const currentUser = yield User_1.default.findById(currentUserId);
        const friendRequestExists = (_b = currentUser === null || currentUser === void 0 ? void 0 : currentUser.friendRequests) === null || _b === void 0 ? void 0 : _b.some(req => req.from.toString() === requesterId && req.status === 'pending');
        if (!friendRequestExists) {
            return res.status(404).json({ error: 'Friend request not found or already processed' });
        }
        // Check if requester still exists
        const requesterExists = yield User_1.default.findById(requesterId);
        if (!requesterExists) {
            return res.status(404).json({ error: 'Requester user not found' });
        }
        // Accept the request - remove from friendRequests and add to friends
        const updatedCurrentUser = yield User_1.default.findByIdAndUpdate(currentUserId, {
            $pull: { friendRequests: { from: requesterId, status: 'pending' } },
            $addToSet: { friends: requesterId } // $addToSet prevents duplicates
        }, { new: true }).select('-password -tokenVersion');
        // Add current user to requester's friends
        yield User_1.default.findByIdAndUpdate(requesterId, {
            $addToSet: { friends: currentUserId }
        });
        return res.status(200).json({
            message: 'Friend request accepted successfully',
            user: updatedCurrentUser
        });
    }
    catch (error) {
        console.error('Error accepting friend request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.acceptFriendRequest = acceptFriendRequest;
const rejectFriendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
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
        const currentUser = yield User_1.default.findById(currentUserId);
        const friendRequestExists = (_b = currentUser === null || currentUser === void 0 ? void 0 : currentUser.friendRequests) === null || _b === void 0 ? void 0 : _b.some(req => req.from.toString() === requesterId && req.status === 'pending');
        if (!friendRequestExists) {
            return res.status(404).json({ error: 'Friend request not found or already processed' });
        }
        const updatedUser = yield User_1.default.findByIdAndUpdate(currentUserId, {
            $pull: { friendRequests: { from: requesterId, status: 'pending' } }
        }, { new: true }).select('-password -tokenVersion');
        return res.status(200).json({
            message: 'Friend request rejected successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Error rejecting friend request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.rejectFriendRequest = rejectFriendRequest;
const deleteFriend = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
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
        const currentUser = yield User_1.default.findById(currentUserId);
        const friendshipExists = (_b = currentUser === null || currentUser === void 0 ? void 0 : currentUser.friends) === null || _b === void 0 ? void 0 : _b.includes(friendId);
        if (!friendshipExists) {
            return res.status(404).json({ error: 'Friendship not found' });
        }
        // Check if friend user exists
        const friendExists = yield User_1.default.findById(friendId);
        if (!friendExists) {
            return res.status(404).json({ error: 'Friend user not found' });
        }
        // Remove friend from both users' lists
        const updatedCurrentUser = yield User_1.default.findByIdAndUpdate(currentUserId, {
            $pull: { friends: friendId }
        }, { new: true }).select('-password -tokenVersion');
        yield User_1.default.findByIdAndUpdate(friendId, {
            $pull: { friends: currentUserId }
        });
        return res.status(200).json({
            message: 'Friend deleted successfully',
            user: updatedCurrentUser
        });
    }
    catch (error) {
        console.error('Error deleting friend:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.deleteFriend = deleteFriend;
const getFriendsList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const currentUser = yield User_1.default.findById(currentUserId);
        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!currentUser.friends || currentUser.friends.length === 0) {
            return res.status(200).json({
                friends: [],
                total: 0,
                onlineCount: 0
            });
        }
        // Get friends sorted by online status
        const friends = yield User_1.default.find({
            _id: { $in: currentUser.friends }
        })
            .select('-password -tokenVersion -email')
            .sort({ onlineStatus: -1, username: 1 }) // Online first, then alphabetically
            .lean();
        const onlineCount = friends.filter(friend => friend.onlineStatus).length;
        return res.status(200).json({
            friends,
            total: friends.length,
            onlineCount
        });
    }
    catch (error) {
        console.error('Error fetching friends list:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getFriendsList = getFriendsList;
const getFriendRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const currentUser = yield User_1.default.findById(currentUserId)
            .populate({
            path: 'friendRequests.from',
            select: '-password -tokenVersion -email'
        });
        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Filter only pending requests and sort by newest first
        const pendingRequests = ((_b = currentUser.friendRequests) === null || _b === void 0 ? void 0 : _b.filter(req => req.status === 'pending').sort((a, b) => { var _a, _b; return (((_a = b.createdAt) === null || _a === void 0 ? void 0 : _a.getTime()) || 0) - (((_b = a.createdAt) === null || _b === void 0 ? void 0 : _b.getTime()) || 0); })) || [];
        return res.status(200).json({
            friendRequests: pendingRequests,
            total: pendingRequests.length
        });
    }
    catch (error) {
        console.error('Error fetching friend requests:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getFriendRequests = getFriendRequests;
const checkFriendshipStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { targetUserId } = req.params;
        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!targetUserId || !targetUserId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: 'Invalid target user ID' });
        }
        if (currentUserId === targetUserId) {
            return res.status(200).json({ status: 'self' });
        }
        const currentUser = yield User_1.default.findById(currentUserId);
        const targetUser = yield User_1.default.findById(targetUserId);
        if (!currentUser || !targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if they are friends
        const areFriends = (_b = currentUser.friends) === null || _b === void 0 ? void 0 : _b.some(friendId => friendId.toString() === targetUserId);
        if (areFriends) {
            return res.status(200).json({ status: 'friends' });
        }
        // Check if current user sent a request to target user (pending in target's requests)
        const sentRequest = (_c = targetUser.friendRequests) === null || _c === void 0 ? void 0 : _c.find(req => req.from.toString() === currentUserId && req.status === 'pending');
        if (sentRequest) {
            return res.status(200).json({ status: 'request_sent' });
        }
        // Check if target user sent a request to current user (pending in current's requests)
        const receivedRequest = (_d = currentUser.friendRequests) === null || _d === void 0 ? void 0 : _d.find(req => req.from.toString() === targetUserId && req.status === 'pending');
        if (receivedRequest) {
            return res.status(200).json({ status: 'request_received' });
        }
        // No relationship
        return res.status(200).json({ status: 'none' });
    }
    catch (error) {
        console.error('Error checking friendship status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.checkFriendshipStatus = checkFriendshipStatus;
