#!/bin/bash

# Chit-Chat API Testing Script
BASE_URL="http://localhost:3000"
TOKEN=""

echo "======================================"
echo "Chit-Chat Backend API Testing"
echo "======================================"
echo ""

# 1. Health Check
echo "1. Testing Health Check..."
curl -X GET "$BASE_URL/ping"
echo -e "\n"

# 2. Sign Up
echo "2. Testing Sign Up..."
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/sign_up" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123!"
  }')
echo "$SIGNUP_RESPONSE" | jq '.'
TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.token')
echo "Token: $TOKEN"
echo ""

# 3. Sign In
echo "3. Testing Sign In..."
SIGNIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/sign_in" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }')
echo "$SIGNIN_RESPONSE" | jq '.'
TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.token')
echo "Token: $TOKEN"
echo ""

# 4. Verify Token
echo "4. Testing Verify Token..."
curl -s -X GET "$BASE_URL/api/auth/verify" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# 5. Refresh Token
echo "5. Testing Refresh Token..."
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/refresh" \
  -H "Authorization: Bearer $TOKEN")
echo "$REFRESH_RESPONSE" | jq '.'
TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.token')
echo "New Token: $TOKEN"
echo ""

# 6. Chat Route
echo "6. Testing Protected Chat Route..."
curl -s -X GET "$BASE_URL/api/chat" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# 7. Logout
echo "7. Testing Logout..."
curl -s -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "======================================"
echo "Testing Complete!"
echo "======================================"
