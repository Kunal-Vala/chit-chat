# Chit-Chat API Documentation

## Overview

This project includes comprehensive API documentation using Swagger/OpenAPI 3.0. The documentation provides an interactive interface where you can explore all available endpoints, view request/response schemas, and even test the API directly from your browser.

## Accessing the Documentation

Once the backend server is running, you can access the API documentation at:

```
http://localhost:5000/api-docs
```

If you're running the server on a different port, replace `5000` with your configured port number.

## Features

The API documentation includes:

- **Interactive API Explorer**: Try out API endpoints directly from the browser
- **Request/Response Examples**: See example payloads for each endpoint
- **Schema Definitions**: Detailed information about data models (User, Message, Conversation, Group)
- **Authentication**: Support for JWT Bearer token authentication
- **Organized by Tags**: Endpoints grouped into logical categories:
  - Authentication
  - Users
  - Chat
  - Groups
  - Friends

## Using the Documentation

### 1. Starting the Server

First, start your backend server:

```bash
npm run dev    # For development
# or
npm start      # For production
```

### 2. Open the Documentation

Navigate to `http://localhost:5000/api-docs` in your web browser.

### 3. Authentication

Many endpoints require authentication. To test authenticated endpoints:

1. First, use the `/api/auth/sign_in` or `/api/auth/sign_up` endpoint to get a JWT token
2. Click the "Authorize" button at the top of the page
3. Enter your token in the format: `Bearer YOUR_TOKEN_HERE` (or just the token itself)
4. Click "Authorize" and then "Close"
5. Now you can test authenticated endpoints

### 4. Testing Endpoints

- Click on any endpoint to expand it
- Click "Try it out" button
- Fill in required parameters and request body
- Click "Execute" to send the request
- View the response below

## API Endpoints Overview

### Authentication (`/api/auth`)
- `POST /sign_up` - Register a new user
- `POST /sign_in` - Sign in an existing user
- `POST /logout` - Logout current user
- `POST /refresh` - Refresh authentication token
- `GET /verify` - Verify current authentication token

### Users (`/api/user`)
- `GET /search` - Search users by username
- `GET /profile/:userid` - Get user profile
- `PUT /profile/:userid` - Update user profile
- `POST /profile/:userid/upload-picture` - Upload profile picture
- `DELETE /profile/:userid/picture` - Delete profile picture

### Friends (`/api/user/friend`)
- `POST /request` - Send friend request
- `POST /accept` - Accept friend request
- `POST /reject` - Reject friend request
- `POST /delete` - Remove a friend
- `GET /` - Get friends list
- `GET /request` - Get pending friend requests
- `GET /status/:targetUserId` - Check friendship status

### Chat (`/api/chat`)
- `GET /conversations` - Get all conversations
- `POST /conversations` - Create new conversation
- `GET /conversations/:conversationId` - Get conversation details
- `PUT /conversations/:conversationId/read` - Mark conversation as read
- `GET /conversations/:conversationId/messages` - Get messages
- `DELETE /messages/:messageId` - Delete a message
- `PUT /messages/:messageId` - Edit a message

### Groups (`/api/groups`)
- `POST /` - Create a new group
- `GET /conversation/:conversationId` - Get group by conversation ID
- `GET /:groupId` - Get group details
- `PUT /:groupId` - Update group
- `DELETE /:groupId` - Delete group
- `POST /:groupId/members` - Add members
- `DELETE /:groupId/members/:userId` - Remove member
- `POST /:groupId/leave` - Leave group
- `PUT /:groupId/admin` - Transfer admin rights
- `GET /:groupId/messages` - Get group messages

## Technical Details

### Technology Stack
- **Swagger UI Express**: Provides the interactive documentation interface
- **Swagger JSDoc**: Generates OpenAPI specification from JSDoc comments
- **OpenAPI 3.0**: API specification standard

### Documentation Source
The API documentation is generated from JSDoc comments in the route files:
- `src/routes/auth.route.ts`
- `src/routes/chat.route.ts`
- `src/routes/user.route.ts`
- `src/routes/group.route.ts`

### Updating Documentation

When you add or modify API endpoints:

1. Add/update JSDoc comments in the route files following the OpenAPI 3.0 specification
2. Recompile the TypeScript code: `npm run tsc`
3. Restart the server
4. The documentation will be automatically updated

## Support

For issues or questions about the API, please refer to the main project README or open an issue in the project repository.
