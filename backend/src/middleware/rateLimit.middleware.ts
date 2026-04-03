import { Request, Response, NextFunction } from 'express';

/**
 * Rate limiter using in-memory storage
 * For production, use Redis-based rate limiting (redis-rate-limit-express)
 */

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

export const createRateLimiter = (windowMs: number, maxRequests: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const key = `${req.ip}-${req.path}`;
        const now = Date.now();

        // Initialize or reset if window expired
        if (!store[key] || store[key].resetTime < now) {
            store[key] = {
                count: 1,
                resetTime: now + windowMs
            };
            return next();
        }

        // Increment counter
        store[key].count++;

        // Set retry-after header
        const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter);

        // Check if limit exceeded
        if (store[key].count > maxRequests) {
            return res.status(429).json({
                error: 'Too many requests, please try again later.',
                retryAfter
            });
        }

        next();
    };
};

/**
 * Specific rate limiters for different endpoints
 */

// General API rate limit: 100 requests per 15 minutes
export const generalLimiter = createRateLimiter(15 * 60 * 1000, 100);

// Auth rate limit: 5 requests per 15 minutes
export const authLimiter = createRateLimiter(15 * 60 * 1000, 5);

// Message rate limit: 50 messages per minute
export const messageLimiter = createRateLimiter(60 * 1000, 50);

// File upload rate limit: 10 uploads per 10 minutes
export const uploadLimiter = createRateLimiter(10 * 60 * 1000, 10);

// Search rate limit: 30 searches per minute
export const searchLimiter = createRateLimiter(60 * 1000, 30);

/**
 * Cleanup old entries periodically to prevent memory leak
 * Run every hour
 */
setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const key in store) {
        if (store[key].resetTime < now) {
            delete store[key];
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        console.log(`[Rate Limiter] Cleaned up ${cleanedCount} expired entries`);
    }
}, 60 * 60 * 1000); // Run every hour
