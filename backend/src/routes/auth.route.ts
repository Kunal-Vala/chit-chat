import  Express  from "express";
import { sign_up } from "../controllers/auth.controller";

export const router = Express.Router();

router.post('/sign_up',sign_up);
// router.post('/sign_in');


