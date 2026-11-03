import { Router } from "express";
import {
  createWorkspaceInvitation,
  getWorkspaceInvitations,
  revokeWorkspaceInvitation,
} from "./workspaceInvitation.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  requireWorkspaceMember,
  requireWorkspaceRole,
} from "./workspace.middleware.js";
import { rateLimit } from "../../middleware/rateLimit.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember, requireWorkspaceRole("owner", "admin"));

router.get("/", getWorkspaceInvitations);

router.post(
  "/",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: "Too many invitations sent. Please try again later.",
  }),
  createWorkspaceInvitation
);

router.delete("/:invitationId", revokeWorkspaceInvitation);

export default router;
