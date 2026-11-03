import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireWorkspaceMember } from "../workspaces/workspace.middleware.js";
import { validateObjectIds } from "../../middleware/validateObjectId.js";
import { getTaskActivity } from "./activity.controller.js";

const router = Router({ mergeParams: true });

router.use(
  validateObjectIds("workspaceId", "projectId", "taskId"),
  requireAuth,
  requireWorkspaceMember
);

router.get("/", getTaskActivity);

export default router;