import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireWorkspaceMember } from "../workspaces/workspace.middleware.js";
import { validateObjectIds } from "../../middleware/validateObjectId.js";
import {
  createComment,
  deleteComment,
  getComments,
} from "./comment.controller.js";

const router = Router({ mergeParams: true });

router.use(
  validateObjectIds("workspaceId", "projectId", "taskId"),
  requireAuth,
  requireWorkspaceMember
);

router.route("/")
  .get(getComments)
  .post(createComment);

router.delete("/:commentId", validateObjectIds("commentId"), deleteComment);

export default router;