import { Router } from "express";
export const router = Router();
import { getUserById, 
    updateUserProfile, 
    searchUsersByUsername, 
    uploadProfilePicture,
    deleteProfilePicture,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    deleteFriend,
    getFriendsList,
    getFriendRequests,
    checkFriendshipStatus,
} from "../controllers/user.controller";
import { authenticateUser } from "../middleware/auth.middleware";
import multer from "multer";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (_req, file, cb) => {
        console.log('Multer fileFilter - Received file:', {
            fieldname: file.fieldname,
            originalname: file.originalname,
            mimetype: file.mimetype,
            encoding: file.encoding
        });

        const allowedMimes = [
            'image/jpeg',
            'image/jpg', 
            'image/png', 
            'image/gif', 
            'image/webp',
            'image/svg+xml',
            'image/bmp'
        ];
        
        // Check MIME type
        if (allowedMimes.includes(file.mimetype)) {
            console.log('File accepted by MIME type:', file.mimetype);
            cb(null, true);
            return;
        }
        
        // Fallback: Check file extension if MIME type is wrong
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
        const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
        
        if (ext && allowedExtensions.includes(ext)) {
            console.log('File accepted by extension:', ext);
            cb(null, true);
            return;
        }
        
        console.log('File rejected - invalid MIME type and extension');
        cb(null, false);
    }
});

/**
 * @swagger
 * /api/user/search:
 *   get:
 *     summary: Search users by username
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for username
 *         example: john
 *     responses:
 *       200:
 *         description: List of matching users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/search', authenticateUser, searchUsersByUsername);

/**
 * @swagger
 * /api/user/profile/{userid}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile/:userid', authenticateUser, getUserById);

/**
 * @swagger
 * /api/user/profile/{userid}:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Updated username
 *               bio:
 *                 type: string
 *                 description: Updated bio
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Updated email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/profile/:userid', authenticateUser, updateUserProfile);

/**
 * @swagger
 * /api/user/profile/{userid}/upload-picture:
 *   post:
 *     summary: Upload profile picture
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture file (max 5MB, image formats only)
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile picture uploaded successfully
 *                 profilePicture:
 *                   type: string
 *                   description: URL of uploaded picture
 *       400:
 *         description: Invalid file or file too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/profile/:userid/upload-picture', authenticateUser, upload.single('profilePicture'), uploadProfilePicture);

/**
 * @swagger
 * /api/user/profile/{userid}/picture:
 *   delete:
 *     summary: Delete profile picture
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Profile picture deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile picture deleted successfully
 *       404:
 *         description: Profile picture not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/profile/:userid/picture', authenticateUser, deleteProfilePicture);

/**
 * @swagger
 * /api/user/friend/request:
 *   post:
 *     summary: Send a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetUserId
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 description: ID of the user to send friend request to
 *     responses:
 *       200:
 *         description: Friend request sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Friend request sent successfully
 *       400:
 *         description: Invalid request or already friends
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/friend/request', authenticateUser, sendFriendRequest);

/**
 * @swagger
 * /api/user/friend/accept:
 *   post:
 *     summary: Accept a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requesterId
 *             properties:
 *               requesterId:
 *                 type: string
 *                 description: ID of the user who sent the friend request
 *     responses:
 *       200:
 *         description: Friend request accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Friend request accepted
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/friend/accept', authenticateUser, acceptFriendRequest);

/**
 * @swagger
 * /api/user/friend/reject:
 *   post:
 *     summary: Reject a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requesterId
 *             properties:
 *               requesterId:
 *                 type: string
 *                 description: ID of the user who sent the friend request
 *     responses:
 *       200:
 *         description: Friend request rejected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Friend request rejected
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/friend/reject', authenticateUser, rejectFriendRequest);

/**
 * @swagger
 * /api/user/friend/delete:
 *   post:
 *     summary: Remove a friend
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - friendId
 *             properties:
 *               friendId:
 *                 type: string
 *                 description: ID of the friend to remove
 *     responses:
 *       200:
 *         description: Friend removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Friend removed successfully
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/friend/delete', authenticateUser, deleteFriend);

/**
 * @swagger
 * /api/user/friend:
 *   get:
 *     summary: Get list of friends
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of friends
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/friend', authenticateUser, getFriendsList);

/**
 * @swagger
 * /api/user/friend/request:
 *   get:
 *     summary: Get list of pending friend requests
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of friend requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   requester:
 *                     $ref: '#/components/schemas/User'
 *                   status:
 *                     type: string
 *                     enum: [pending, accepted, rejected]
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/friend/request', authenticateUser, getFriendRequests);

/**
 * @swagger
 * /api/user/friend/status/{targetUserId}:
 *   get:
 *     summary: Check friendship status with a user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the target user
 *     responses:
 *       200:
 *         description: Friendship status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [friends, pending, not_friends, request_received]
 *                   description: Current friendship status
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/friend/status/:targetUserId', authenticateUser, checkFriendshipStatus);