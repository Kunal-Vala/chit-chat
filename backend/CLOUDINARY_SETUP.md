# Cloudinary Setup Guide

Add these environment variables to your `.env.development` and `.env.production` files:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## How to get these credentials:

1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Sign up or log in
3. On the Dashboard, you'll find:
   - **Cloud Name**: Your unique identifier
   - **API Key**: Your API key
   - **API Secret**: Your API secret (keep this private!)

## Usage

### 1. Upload Profile Picture (File Upload)
**Endpoint:** `POST /api/users/profile/:userid/picture`
**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body:** 
- Form field: `profilePicture` (file)

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/users/profile/123abc/picture \
  -H "Authorization: Bearer your_token" \
  -F "profilePicture=@/path/to/image.jpg"
```

**Response:**
```json
{
  "message": "Profile picture uploaded successfully",
  "user": {
    "_id": "123abc",
    "username": "john_doe",
    "profilePictureUrl": "https://res.cloudinary.com/...",
    "statusText": "Hello!",
    "onlineStatus": false
  }
}
```

### 2. Update Profile with Image URL or Base64
**Endpoint:** `PUT /api/users/profile/:userid`
**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "username": "new_username",
  "statusText": "New status",
  "profilePictureUrl": "https://example.com/image.jpg"
}
```

The system will:
- Download the image from the URL
- Upload it to Cloudinary
- Delete the old image from Cloudinary
- Store the Cloudinary URL in the database

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "_id": "123abc",
    "username": "new_username",
    "profilePictureUrl": "https://res.cloudinary.com/...",
    "statusText": "New status",
    "onlineStatus": false
  }
}
```

### 3. Using Base64 Data URL
You can also send base64 encoded images:

**Body:**
```json
{
  "profilePictureUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDA..."
}
```

## Features

✅ **Automatic image download and upload** - Share a URL, we'll download and upload to Cloudinary
✅ **Base64 support** - Send base64 encoded images directly
✅ **File upload** - Upload files directly with multipart/form-data
✅ **Auto cleanup** - Old images are automatically deleted from Cloudinary
✅ **Image optimization** - Cloudinary auto-optimizes images
✅ **Validation** - Only image files allowed (JPEG, PNG, GIF, WebP)
✅ **Size limit** - 5MB max file size
