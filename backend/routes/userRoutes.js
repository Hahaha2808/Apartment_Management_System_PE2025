import express from "express";
import {
  registerUser,
  SignInUser,
  refreshUserSession,
  logoutUserSession,
} from "../controllers/userController.js";
import { requireSessionOrigin } from "../middleware/sessionSecurity.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/signin", requireSessionOrigin, SignInUser);
router.post("/refresh", requireSessionOrigin, refreshUserSession);
router.post("/logout", requireSessionOrigin, logoutUserSession);
export default router;
