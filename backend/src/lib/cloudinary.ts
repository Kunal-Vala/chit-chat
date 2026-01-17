import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
// import fs from 'fs';
// import path from 'path';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../config/env';

// Configure Cloudinary
cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary
 * @param buffer - File buffer from multipart upload
 * @param folder - Cloudinary folder name
 * @returns Cloudinary secure URL
 */
export const uploadBufferToCloudinary = async (
    buffer: Buffer,
    folder: string = 'profile-pictures'
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'auto',
                quality: 'auto',
                fetch_format: 'auto',
            },
            (error, result) => {
                if (error) {
                    reject(new Error(`Cloudinary upload failed: ${error.message}`));
                } else if (result?.secure_url) {
                    resolve(result.secure_url);
                } else {
                    reject(new Error('Failed to get secure URL from Cloudinary'));
                }
            }
        );
        stream.end(buffer);
    });
};

/**
 * Download image from URL and upload to Cloudinary
 * @param imageUrl - URL of the image to download
 * @param folder - Cloudinary folder name
 * @returns Cloudinary secure URL
 */
export const downloadAndUploadToCloudinary = async (
    imageUrl: string,
    folder: string = 'profile-pictures'
): Promise<string> => {
    try {
        // Download the image
        const response = await axios.get(imageUrl, {
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
        return await uploadBufferToCloudinary(buffer, folder);
    } catch (error) {
        if (error instanceof axios.AxiosError) {
            throw new Error(`Failed to download image from URL: ${error.message}`);
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Unknown error occurred while downloading and uploading image');
    }
};

/**
 * Delete image from Cloudinary by public ID
 * @param publicId - Cloudinary public ID
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error(`Failed to delete image from Cloudinary: ${publicId}`, error);
    }
};

/**
 * Extract public ID from Cloudinary URL
 * @param cloudinaryUrl - Cloudinary URL
 * @returns Public ID
 */
export const extractPublicIdFromUrl = (cloudinaryUrl: string): string => {
    try {
        const match = cloudinaryUrl.match(/\/([^/]+)\/([^/]+)$/);
        if (match && match[2]) {
            return `${match[1]}/${match[2].split('.')[0]}`;
        }
        return '';
    } catch (error) {
        console.error('Error extracting public ID from Cloudinary URL:', error);
        return '';
    }
};
