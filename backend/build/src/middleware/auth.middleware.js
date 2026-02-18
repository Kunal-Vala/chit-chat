"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const User_1 = __importDefault(require("../models/User"));
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
const authenticateUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        const decoded = jsonwebtoken_1.default.verify(jwtToken, env_1.JWT_SECRET, {
            algorithms: ['HS256']
        });
        // Verify tokenVersion matches database (token not invalidated)
        const user = yield User_1.default.findById(decoded.userId);
        if (!user || user.tokenVersion !== decoded.tokenVersion) {
            return res.status(401).json({ message: "Token has been invalidated" });
        }
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            username: decoded.username,
            tokenVersion: decoded.tokenVersion
        };
        return next();
    }
    catch (error) {
        console.error('Authentication error:', error instanceof Error ? error.message : 'Unknown error');
        return res.status(401).json({ message: "Unauthorized" });
    }
});
exports.authenticateUser = authenticateUser;
