import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireWorkspaceMember } from "../workspaces/workspace.middleware.js";
import { validateObjectIds } from "../../middleware/validateObjectId.js";

import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
} from "./task.controller.js";

const router = Router({ mergeParams: true });

router.use(
  validateObjectIds("workspaceId", "projectId"),
  requireAuth,
  requireWorkspaceMember
);

router.route("/")
  .get(getTasks)
  .post(createTask);

router.route("/:taskId")
  .all(validateObjectIds("taskId"))
  .patch(updateTask)
  .delete(deleteTask);

export default router;
