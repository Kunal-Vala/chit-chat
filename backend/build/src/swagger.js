"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Chit-Chat API Documentation',
            version: '1.0.0',
            description: 'A comprehensive real-time chat application API with user management, messaging, and group chat features',
            contact: {
                name: 'API Support',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'User ID',
                        },
                        username: {
                            type: 'string',
                            description: 'Username',
                        },
                        email: {
                            type: 'string',
                            description: 'Email address',
                        },
                        profilePicture: {
                            type: 'string',
                            description: 'Profile picture URL',
                        },
                        bio: {
                            type: 'string',
                            description: 'User bio',
                        },
                        friends: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: 'List of friend user IDs',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Message: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Message ID',
                        },
                        conversationId: {
                            type: 'string',
                            description: 'Conversation ID',
                        },
                        senderId: {
                            type: 'string',
                            description: 'Sender user ID',
                        },
                        content: {
                            type: 'string',
                            description: 'Message content',
                        },
                        messageType: {
                            type: 'string',
                            enum: ['text', 'image', 'file'],
                            description: 'Type of message',
                        },
                        isEdited: {
                            type: 'boolean',
                            description: 'Whether message was edited',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Conversation: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Conversation ID',
                        },
                        participants: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: 'Array of participant user IDs',
                        },
                        lastMessage: {
                            type: 'string',
                            description: 'Last message ID',
                        },
                        isGroup: {
                            type: 'boolean',
                            description: 'Whether this is a group conversation',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Group: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Group ID',
                        },
                        name: {
                            type: 'string',
                            description: 'Group name',
                        },
                        description: {
                            type: 'string',
                            description: 'Group description',
                        },
                        conversationId: {
                            type: 'string',
                            description: 'Associated conversation ID',
                        },
                        admin: {
                            type: 'string',
                            description: 'Admin user ID',
                        },
                        members: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: 'Array of member user IDs',
                        },
                        groupPicture: {
                            type: 'string',
                            description: 'Group picture URL',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Error message',
                        },
                        error: {
                            type: 'string',
                            description: 'Error details',
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and authorization endpoints',
            },
            {
                name: 'Users',
                description: 'User management and profile endpoints',
            },
            {
                name: 'Chat',
                description: 'Conversation and messaging endpoints',
            },
            {
                name: 'Groups',
                description: 'Group chat management endpoints',
            },
            {
                name: 'Friends',
                description: 'Friend management endpoints',
            },
        ],
    },
    apis: ['./src/routes/*.ts', './build/routes/*.js'], // Path to the API routes
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
