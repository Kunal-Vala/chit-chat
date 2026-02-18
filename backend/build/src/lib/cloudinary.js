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
exports.extractPublicIdFromUrl = exports.deleteFromCloudinary = exports.downloadAndUploadToCloudinary = exports.uploadBufferToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const axios_1 = __importDefault(require("axios"));
// import fs from 'fs';
// import path from 'path';
const env_1 = require("../config/env");
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: env_1.CLOUDINARY_CLOUD_NAME,
    api_key: env_1.CLOUDINARY_API_KEY,
    api_secret: env_1.CLOUDINARY_API_SECRET,
});
/**
 * Upload a file buffer to Cloudinary
 * @param buffer - File buffer from multipart upload
 * @param folder - Cloudinary folder name
 * @returns Cloudinary secure URL
 */
const uploadBufferToCloudinary = (buffer_1, ...args_1) => __awaiter(void 0, [buffer_1, ...args_1], void 0, function* (buffer, folder = 'profile-pictures') {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            resource_type: 'auto',
            quality: 'auto',
            fetch_format: 'auto',
        }, (error, result) => {
            if (error) {
                reject(new Error(`Cloudinary upload failed: ${error.message}`));
            }
            else if (result === null || result === void 0 ? void 0 : result.secure_url) {
                resolve(result.secure_url);
            }
            else {
                reject(new Error('Failed to get secure URL from Cloudinary'));
            }
        });
        stream.end(buffer);
    });
});
exports.uploadBufferToCloudinary = uploadBufferToCloudinary;
/**
 * Download image from URL and upload to Cloudinary
 * @param imageUrl - URL of the image to download
 * @param folder - Cloudinary folder name
 * @returns Cloudinary secure URL
 */
const downloadAndUploadToCloudinary = (imageUrl_1, ...args_1) => __awaiter(void 0, [imageUrl_1, ...args_1], void 0, function* (imageUrl, folder = 'profile-pictures') {
    try {
        // Download the image
        const response = yield axios_1.default.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
        });
        // Validate response
        if (response.status !== 200) {
            throw new Error(`Failed to download image: HTTP ${response.status}`);
        }
        // Validate content type
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error(`Invalid content type: ${contentType}. Expected image.`);
        }
        // Create buffer from response
        const buffer = Buffer.from(response.data, 'binary');
        // Upload to Cloudinary
        return yield (0, exports.uploadBufferToCloudinary)(buffer, folder);
    }
    catch (error) {
        if (error instanceof axios_1.default.AxiosError) {
            throw new Error(`Failed to download image from URL: ${error.message}`);
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Unknown error occurred while downloading and uploading image');
    }
});
exports.downloadAndUploadToCloudinary = downloadAndUploadToCloudinary;
/**
 * Delete image from Cloudinary by public ID
 * @param publicId - Cloudinary public ID
 */
const deleteFromCloudinary = (publicId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield cloudinary_1.v2.uploader.destroy(publicId);
    }
    catch (error) {
        console.error(`Failed to delete image from Cloudinary: ${publicId}`, error);
    }
});
exports.deleteFromCloudinary = deleteFromCloudinary;
/**
 * Extract public ID from Cloudinary URL
 * @param cloudinaryUrl - Cloudinary URL
 * @returns Public ID
 */
const extractPublicIdFromUrl = (cloudinaryUrl) => {
    try {
        const match = cloudinaryUrl.match(/\/([^/]+)\/([^/]+)$/);
        if (match && match[2]) {
            return `${match[1]}/${match[2].split('.')[0]}`;
        }
        return '';
    }
    catch (error) {
        console.error('Error extracting public ID from Cloudinary URL:', error);
        return '';
    }
};
exports.extractPublicIdFromUrl = extractPublicIdFromUrl;
