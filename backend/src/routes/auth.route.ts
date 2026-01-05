import Express from "express";
import { sign_up, sign_in, logout, refresh, verify } from "../controllers/auth.controller";
import { authenticateUser } from "../middleware/auth.middleware";

export const router = Express.Router();

router.post('/sign_up', sign_up);
router.post('/sign_in', sign_in);
router.post('/logout', authenticateUser, logout);
router.post('/refresh', authenticateUser, refresh);
router.get('/verify', authenticateUser, verify);


