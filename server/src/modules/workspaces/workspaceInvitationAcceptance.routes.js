import { Router } from "express";
import { acceptWorkspaceInvitation } from "./workspaceInvitation.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";

const router = Router();

router.post("/accept", requireAuth, acceptWorkspaceInvitation);

export default router;