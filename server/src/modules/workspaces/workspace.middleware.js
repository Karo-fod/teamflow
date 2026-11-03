
import mongoose from "mongoose";
import WorkspaceMember from "./workspaceMember.model.js";

export async function requireWorkspaceMember(req, res, next) {
  try {
    const { workspaceId } = req.params;

    if (!mongoose.isValidObjectId(workspaceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID",
      });
    }

    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.userId,
    }).populate("workspaceId", "name slug createdBy");

    if (!membership || !membership.workspaceId) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this workspace",
      });
    }

    req.workspace = membership.workspaceId;
    req.workspaceMembership = membership;

    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireWorkspaceRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.workspaceMembership) {
      return res.status(500).json({
        success: false,
        message: "Workspace authorization middleware is missing",
      });
    }

    if (!allowedRoles.includes(req.workspaceMembership.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    return next();
  };
}
