import mongoose from "mongoose";
import Project from "./project.model.js";

function emitProjectEvent(req, event, project) {
  req.app
    .get("io")
    ?.to(`workspace:${req.params.workspaceId}`)
    .emit(event, { _id: project._id, workspaceId: req.params.workspaceId });
}

export async function createProject(req, res, next) {
  try {
    const { name, description = "" } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Project name must be between 2 and 100 characters",
      });
    }

    if (
      typeof description !== "string" ||
      description.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Project description must not exceed 2000 characters",
      });
    }

    const project = await Project.create({
      name: name.trim(),
      description: description.trim(),
      workspaceId: req.workspace._id,
      createdBy: req.userId,
    });

    emitProjectEvent(req, "project:created", project);

    return res.status(201).json({
      success: true,
      project,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjects(req, res, next) {
  try {
    const projects = await Project.find({
      workspaceId: req.params.workspaceId,
      isArchived: false,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProject(req, res, next) {
  try {
    const { workspaceId, projectId } = req.params;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      workspaceId,
      isArchived: false,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req, res, next) {
  try {
    const { name, description } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid project name",
        });
      }

      updates.name = name.trim();
    }

    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        description.length > 2000
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid project description",
        });
      }

      updates.description = description.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide a project field to update",
      });
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.projectId,
        workspaceId: req.params.workspaceId,
        isArchived: false,
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    emitProjectEvent(req, "project:updated", project);

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    next(error);
  }
}

// Soft-deletes (archives) a project. Allowed for workspace owners/admins and
// for the person who created the project. Its tasks are kept.
export async function archiveProject(req, res, next) {
  try {
    const { workspaceId, projectId } = req.params;

    const project = await Project.findOne({
      _id: projectId,
      workspaceId,
      isArchived: false,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const role = req.workspaceMembership.role;
    const isCreator = String(project.createdBy) === req.userId;

    if (!isCreator && !["owner", "admin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Only workspace admins or the project's creator can archive it",
      });
    }

    project.isArchived = true;
    await project.save();

    emitProjectEvent(req, "project:archived", project);

    return res.status(200).json({
      success: true,
      message: "Project archived",
    });
  } catch (error) {
    next(error);
  }
}
