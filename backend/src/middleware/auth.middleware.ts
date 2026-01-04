import { JwtPayloadType, AuthenticatedRequest } from "../types";
import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";
import { JWT_SECRET } from "../config/env";

/**
 * Middleware function to authenticate incoming requests using JWT tokens.
 * 
 * Validates the Authorization header for a valid Bearer token format,
 * verifies the JWT signature, and attaches the decoded user information
 * to the request object for downstream handlers.
 * 
 * @param req - The authenticated request object with optional user data
 * @param res - The response object used to send HTTP responses
 * @param next - The next middleware function in the chain
 * 
 * @returns Calls next() to continue to the next middleware if authentication succeeds,
 *          or sends a 401 Unauthorized response if authentication fails
 * 
 * @throws Sends 401 response if:
 *         - Authorization header is missing
 *         - Token format is invalid (not "Bearer <token>")
 *         - JWT verification fails
 * 
 * @example
 * app.use(authenticateUser);
 */
export const authenticateUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authorizationHeader = req.headers.authorization;

        if (!authorizationHeader) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parts = authorizationHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({ message: "Invalid token format" });
        }

        const jwtToken = parts[1];

        if (!jwtToken) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const decoded = jwt.verify(jwtToken, JWT_SECRET, {
            algorithms: ['HS256']
        }) as JwtPayloadType;

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            username: decoded.username
        };

        return next();

    } catch (error) {
        console.error('Authentication error:', error instanceof Error ? error.message : 'Unknown error');
        return res.status(401).json({ message: "Unauthorized" });
    }
};