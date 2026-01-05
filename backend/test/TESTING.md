# Chit-Chat Backend - API Testing Guide

Server is running at: `http://localhost:3000`

## Prerequisites
Make sure you have MongoDB running locally or update `.env.development` with your MongoDB connection string.

## Testing Options

### Option 1: Using VS Code REST Client Extension
1. Install "REST Client" extension in VS Code
2. Open `test-api.http` file
3. Click "Send Request" above each request
4. After sign_up or sign_in, copy the token and replace `{{token}}` in the file

### Option 2: Using Bash Script (Linux/Mac/Git Bash)
```bash
chmod +x test-api.sh
./test-api.sh
```

### Option 3: Using cURL Commands

#### 1. Health Check
```bash
curl http://localhost:3000/ping
```

#### 2. Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/sign_up \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

#### 3. Sign In (Copy the token from response)
```bash
curl -X POST http://localhost:3000/api/auth/sign_in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

#### 4. Verify Token (Replace YOUR_TOKEN with actual token)
```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. Refresh Token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 6. Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 7. Chat Route (Protected)
```bash
curl -X GET http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Option 4: Using Postman or Thunder Client
Import the endpoints from `test-api.http` file.

## Expected Responses

### Sign Up Success (201)
```json
{
  "message": "User Created Successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "67...",
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

### Sign In Success (200)
```json
{
  "message": "Signed in successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "67...",
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

### Verify Token Success (200)
```json
{
  "valid": true,
  "user": {
    "userId": "67...",
    "username": "testuser",
    "email": "test@example.com",
    "onlineStatus": false
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```

#### 409 User Already Exists
```json
{
  "error": "User already exists"
}
```

## Notes
- All protected routes require `Authorization: Bearer <token>` header
- Tokens expire after 1 day
- Make sure MongoDB is running before testing
