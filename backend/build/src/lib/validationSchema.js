"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUpdateProfileInput = exports.updateProfileSchema = exports.toSignInInput = exports.signInSchema = exports.toSignUpInput = exports.signUpSchema = void 0;
const zod_1 = require("zod");
exports.signUpSchema = zod_1.z.object({
    username: zod_1.z.string()
        .min(7, 'Username must be at least 7 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: zod_1.z.string()
        .email('Invalid email format'),
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});
const toSignUpInput = (object) => {
    return exports.signUpSchema.parse(object);
};
exports.toSignUpInput = toSignUpInput;
exports.signInSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email('Invalid email format'),
    password: zod_1.z.string()
        .min(1, 'Password is required'),
});
const toSignInInput = (object) => {
    return exports.signInSchema.parse(object);
};
exports.toSignInInput = toSignInInput;
exports.updateProfileSchema = zod_1.z.object({
    username: zod_1.z.string()
        .min(7, 'Username must be at least 7 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .optional(),
    statusText: zod_1.z.string()
        .max(150, 'Status text must be at most 150 characters')
        .optional(),
    profilePictureUrl: zod_1.z.string()
        .url('Invalid URL format')
        .optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided for update' });
const toUpdateProfileInput = (object) => {
    return exports.updateProfileSchema.parse(object);
};
exports.toUpdateProfileInput = toUpdateProfileInput;
