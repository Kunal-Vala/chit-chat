import { z } from 'zod';

export const signUpSchema = z.object({
    username: z.string()
        .min(7, 'Username must be at least 7 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string()
        .email('Invalid email format'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});


export type SignUpInput = z.infer<typeof signUpSchema>;

export const toSignUpInput = (object: unknown): SignUpInput => {
    return signUpSchema.parse(object);
};

export const signInSchema = z.object({
    email: z.string()
        .email('Invalid email format'),
    password: z.string()
        .min(1, 'Password is required'),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const toSignInInput = (object: unknown): SignInInput => {
    return signInSchema.parse(object);
};