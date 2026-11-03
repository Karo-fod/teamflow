import { Router } from "express";
import {
  getWorkspaceMembers,
  removeWorkspaceMember,
  updateMemberRole,
} from "./workspaceMember.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  requireWorkspaceMember,
  requireWorkspaceRole,
} from "./workspace.middleware.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

router.get("/", getWorkspaceMembers);

router.patch("/:userId", requireWorkspaceRole("owner"), updateMemberRole);

router.delete("/:userId", removeWorkspaceMember);

export default router;
