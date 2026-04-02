import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

const ALLOWED_CHAT_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
]);

export const CHAT_IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;

const uploadChatImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: CHAT_IMAGE_MAX_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_CHAT_IMAGE_MIME_TYPES.has(file.mimetype)) {
            cb(new Error('Only JPG, PNG, WEBP, and GIF images are allowed'));
            return;
        }
        cb(null, true);
    }
});

export const handleChatImageUpload = (req: Request, res: Response, next: NextFunction) => {
    uploadChatImage.single('file')(req, res, (error: unknown) => {
        if (!error) {
            next();
            return;
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
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