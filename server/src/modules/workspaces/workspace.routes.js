import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware.js";
import workspaceMemberRoutes from "./workspaceMember.routes.js";
import workspaceInvitationRoutes from "./workspaceInvitation.routes.js";
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
} from "./workspace.controller.js";

import {
  requireWorkspaceMember,
  requireWorkspaceRole,
} from "./workspace.middleware.js";

import { validateObjectIds } from "../../middleware/validateObjectId.js";

const router = Router();

// List the workspaces the current user belongs to.
router.get("/", requireAuth, getMyWorkspaces);

// Create a new workspace; the caller becomes its owner.
router.post("/", requireAuth, createWorkspace);

router.use("/:workspaceId", validateObjectIds("workspaceId"));

// Get a specific workspace.
router.get(
  "/:workspaceId",
  requireAuth,
  requireWorkspaceMember,
  getWorkspace
);

// Only owners and admins can rename a workspace.
router.patch(
  "/:workspaceId",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("owner", "admin"),
  updateWorkspace
);
router.use("/:workspaceId/members", workspaceMemberRoutes);
router.use("/:workspaceId/invitations", workspaceInvitationRoutes);

export default router;