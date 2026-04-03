"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchLimiter = exports.uploadLimiter = exports.messageLimiter = exports.authLimiter = exports.generalLimiter = exports.createRateLimiter = void 0;
const store = {};
const createRateLimiter = (windowMs, maxRequests) => {
    return (req, res, next) => {
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
exports.createRateLimiter = createRateLimiter;
/**
 * Specific rate limiters for different endpoints
 */
// General API rate limit: 100 requests per 15 minutes
exports.generalLimiter = (0, exports.createRateLimiter)(15 * 60 * 1000, 100);
// Auth rate limit: 5 requests per 15 minutes
exports.authLimiter = (0, exports.createRateLimiter)(15 * 60 * 1000, 5);
// Message rate limit: 50 messages per minute
exports.messageLimiter = (0, exports.createRateLimiter)(60 * 1000, 50);
// File upload rate limit: 10 uploads per 10 minutes
exports.uploadLimiter = (0, exports.createRateLimiter)(10 * 60 * 1000, 10);
// Search rate limit: 30 searches per minute
exports.searchLimiter = (0, exports.createRateLimiter)(60 * 1000, 30);
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
