import { Router } from "express";
export const router = Router();
import { getUserById, 
    updateUserProfile, 
    searchUsersByUsername, 
    uploadProfilePicture,
    sendFriendRequest,
    acceptFriendRequest,
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

router.get('/search', authenticateUser, searchUsersByUsername);
router.get('/profile/:userid', authenticateUser, getUserById);
router.put('/profile/:userid', authenticateUser, updateUserProfile);
router.post('/profile/:userid/upload-picture', authenticateUser, upload.single('profilePicture'), uploadProfilePicture);
router.post('/friend/request', authenticateUser, sendFriendRequest);
router.post('/friend/accept', authenticateUser, acceptFriendRequest);