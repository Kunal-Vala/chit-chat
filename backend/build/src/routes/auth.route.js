"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.router = express_1.default.Router();
exports.router.post('/sign_up', auth_controller_1.sign_up);
exports.router.post('/sign_in', auth_controller_1.sign_in);
exports.router.post('/logout', auth_middleware_1.authenticateUser, auth_controller_1.logout);
exports.router.post('/refresh', auth_middleware_1.authenticateUser, auth_controller_1.refresh);
exports.router.get('/verify', auth_middleware_1.authenticateUser, auth_controller_1.verify);
