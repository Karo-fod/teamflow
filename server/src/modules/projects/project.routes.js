import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireWorkspaceMember } from "../workspaces/workspace.middleware.js";
import { validateObjectIds } from "../../middleware/validateObjectId.js";

import {
  archiveProject,
  createProject,
  getProjects,
  getProject,
  updateProject,
} from "./project.controller.js";

const router = Router({ mergeParams: true });

router.use(validateObjectIds("workspaceId"), requireAuth, requireWorkspaceMember);

router.route("/")
  .get(getProjects)
  .post(createProject);

router.route("/:projectId")
  .all(validateObjectIds("projectId"))
  .get(getProject)
  .patch(updateProject)
  .delete(archiveProject);

export default router;
