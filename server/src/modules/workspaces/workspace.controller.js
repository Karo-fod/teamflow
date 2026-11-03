import Workspace from "./workspace.model.js";
import WorkspaceMember from "./workspaceMember.model.js";
import { createWorkspaceForUser } from "./workspace.service.js";

export async function getMyWorkspaces(req, res, next) {
  try {
    const memberships = await WorkspaceMember.find({
      userId: req.userId,
    })
      .populate("workspaceId", "name slug createdBy createdAt")
      .sort({ createdAt: -1 });

    const workspaces = memberships
      .filter((membership) => membership.workspaceId)
      .map((membership) => ({
        id: membership.workspaceId._id.toString(),
        name: membership.workspaceId.name,
        slug: membership.workspaceId.slug,
        role: membership.role,
        createdAt: membership.workspaceId.createdAt,
      }));

    return res.status(200).json({
      success: true,
      workspaces,
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkspace(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      workspace: {
        id: req.workspace._id.toString(),
        name: req.workspace.name,
        slug: req.workspace.slug,
        role: req.workspaceMembership.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkspace(req, res, next) {
  try {
    const { name } = req.body;

    if (typeof name !== "string" || name.trim().length < 2 ||
        name.trim().length > 80) {
      return res.status(400).json({
        success: false,
        message: "Workspace name must be between 2 and 80 characters",
      });
    }

    const workspace = await Workspace.findByIdAndUpdate(
      req.workspace._id,
      { $set: { name: name.trim() } },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      workspace: {
        id: workspace._id.toString(),
        name: workspace.name,
        slug: workspace.slug,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createWorkspace(req, res, next) {
  try {
    const name =
      typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Workspace name must be between 2 and 80 characters",
      });
    }

    const workspace = await createWorkspaceForUser({ _id: req.userId }, name);

    return res.status(201).json({
      success: true,
      workspace: {
        id: workspace._id.toString(),
        name: workspace.name,
        slug: workspace.slug,
        role: "owner",
        createdAt: workspace.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}
