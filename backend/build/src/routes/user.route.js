"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
exports.router = (0, express_1.Router)();
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (_req, file, cb) => {
        var _a;
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
        const ext = (_a = file.originalname.toLowerCase().match(/\.[^.]+$/)) === null || _a === void 0 ? void 0 : _a[0];
        if (ext && allowedExtensions.includes(ext)) {
            console.log('File accepted by extension:', ext);
            cb(null, true);
            return;
        }
        console.log('File rejected - invalid MIME type and extension');
        cb(null, false);
    }
});
exports.router.get('/search', auth_middleware_1.authenticateUser, user_controller_1.searchUsersByUsername);
exports.router.get('/profile/:userid', auth_middleware_1.authenticateUser, user_controller_1.getUserById);
exports.router.put('/profile/:userid', auth_middleware_1.authenticateUser, user_controller_1.updateUserProfile);
exports.router.post('/profile/:userid/upload-picture', auth_middleware_1.authenticateUser, upload.single('profilePicture'), user_controller_1.uploadProfilePicture);
exports.router.delete('/profile/:userid/picture', auth_middleware_1.authenticateUser, user_controller_1.deleteProfilePicture);
exports.router.post('/friend/request', auth_middleware_1.authenticateUser, user_controller_1.sendFriendRequest);
exports.router.post('/friend/accept', auth_middleware_1.authenticateUser, user_controller_1.acceptFriendRequest);
exports.router.post('/friend/reject', auth_middleware_1.authenticateUser, user_controller_1.rejectFriendRequest);
exports.router.post('/friend/delete', auth_middleware_1.authenticateUser, user_controller_1.deleteFriend);
exports.router.get('/friend', auth_middleware_1.authenticateUser, user_controller_1.getFriendsList);
exports.router.get('/friend/request', auth_middleware_1.authenticateUser, user_controller_1.getFriendRequests);
exports.router.get('/friend/status/:targetUserId', auth_middleware_1.authenticateUser, user_controller_1.checkFriendshipStatus);
