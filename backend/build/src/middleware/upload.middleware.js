"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChatImageUpload = exports.CHAT_IMAGE_MAX_SIZE_BYTES = void 0;
const multer_1 = __importDefault(require("multer"));
const ALLOWED_CHAT_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
]);
exports.CHAT_IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const uploadChatImage = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: exports.CHAT_IMAGE_MAX_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_CHAT_IMAGE_MIME_TYPES.has(file.mimetype)) {
            cb(new Error('Only JPG, PNG, WEBP, and GIF images are allowed'));
            return;
        }
        cb(null, true);
    }
});
const handleChatImageUpload = (req, res, next) => {
    uploadChatImage.single('file')(req, res, (error) => {
        if (!error) {
            next();
            return;
        }
        if (error instanceof multer_1.default.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({ error: 'Image size exceeds 10 MB limit' });
            return;
        }
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to process image upload' });
    });
};
exports.handleChatImageUpload = handleChatImageUpload;
