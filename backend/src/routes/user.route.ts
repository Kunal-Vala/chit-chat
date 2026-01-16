import { Router } from "express";
export const router = Router();
import { getUserById } from "../controllers/user.controller";
import { authenticateUser } from "../middleware/auth.middleware";

router.get('/profile/:userid', authenticateUser, getUserById);