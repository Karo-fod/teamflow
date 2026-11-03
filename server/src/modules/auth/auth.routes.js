
import { Router } from "express";

import { login, register } from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";
import { getProfile, updateProfile } from "./profile.controller.js";
import { rateLimit } from "../../middleware/rateLimit.js";

const router = Router();

// Slow down password guessing and bulk sign-ups.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many attempts. Please wait a few minutes and try again.",
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

router.get("/me", requireAuth, getProfile);
router.patch("/me", requireAuth, updateProfile);

export default router;
