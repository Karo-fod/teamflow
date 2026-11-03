import mongoose from "mongoose";
import Project from "../projects/project.model.js";
import Task from "./task.model.js";
import WorkspaceMember from "../workspaces/workspaceMember.model.js";
import Activity from "../activity/activity.model.js";
import Comment from "../comments/comment.model.js";

const statuses = ["todo", "in_progress", "done"];
const priorities = ["low", "medium", "high", "urgent"];

export async function createTask(req, res, next) {
  try {
    const { workspaceId, projectId } = req.params;
    const {
      title,
      description = "",
      priority = "medium",
      assigneeId = null,
      dueDate = null,
    } = req.body;

    if (
      typeof title !== "string" ||
      title.trim().length < 2 ||
      title.trim().length > 200
    ) {
      return res.status(400).json({
        success: false,
        message: "Task title must be between 2 and 200 characters",
      });
    }

    if (
      typeof description !== "string" ||
      description.length > 10000
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task description",
      });
    }

    if (!priorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task priority",
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
        message: "Project not found in this workspace",
      });
    }

    if (assigneeId !== null) {
      if (!mongoose.isValidObjectId(assigneeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignee ID",
        });
      }

      const assigneeMembership = await WorkspaceMember.exists({
        workspaceId,
        userId: assigneeId,
      });

      if (!assigneeMembership) {
        return res.status(400).json({
          success: false,
          message: "Assignee must belong to this workspace",
        });
      }
    }

    let parsedDueDate = null;

    if (dueDate !== null) {
      parsedDueDate = new Date(dueDate);

      if (
        typeof dueDate !== "string" ||
        !Number.isFinite(parsedDueDate.getTime())
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date",
        });
      }
    }

    const created = await Task.create({
      title: title.trim(),
      description: description.trim(),
      workspaceId,
      projectId,
      createdBy: req.userId,
      assigneeId,
      priority,
      dueDate: parsedDueDate,
    });

    await Activity.create({
      workspaceId,
      projectId,
      taskId: created._id,
      actorId: req.userId,
      type: "task.created",
      details: { title: created.title },
    });

    const task = await Task.findById(created._id).populate(
      "assigneeId",
      "name email"
    );

    req.app
      .get("io")
      ?.to(`workspace:${workspaceId}`)
      .emit("task:created", task);

    return res.status(201).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTasks(req, res, next) {
  try {
    const { workspaceId, projectId } = req.params;

    const filter = { workspaceId, projectId };

    if (req.query.status) {
      if (!statuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task status",
        });
      }

      filter.status = req.query.status;
    }

    if (req.query.priority) {
      if (!priorities.includes(req.query.priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task priority",
        });
      }

      filter.priority = req.query.priority;
    }

    const tasks = await Task.find(filter)
      .populate("assigneeId", "name email")
      .sort({ position: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req, res, next) {
  try {
    const { workspaceId, taskId, projectId } = req.params;
    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "assigneeId",
      "dueDate",
      "position",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid task fields provided",
      });
    }

    if (
      updates.title !== undefined &&
      (typeof updates.title !== "string" ||
        updates.title.trim().length < 2 ||
        updates.title.trim().length > 200)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task title",
      });
    }

    if (
      updates.description !== undefined &&
      (typeof updates.description !== "string" ||
        updates.description.length > 10000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task description",
      });
    }

    if (
      updates.status !== undefined &&
      !statuses.includes(updates.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
    }

    if (
      updates.priority !== undefined &&
      !priorities.includes(updates.priority)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task priority",
      });
    }

    if (updates.position !== undefined) {
      if (
        typeof updates.position !== "number" ||
        !Number.isFinite(updates.position) ||
        updates.position < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid task position",
        });
      }
    }

    if (updates.title !== undefined) {
      updates.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      updates.description = updates.description.trim();
    }

    if (updates.assigneeId !== undefined &&
        updates.assigneeId !== null) {
      if (!mongoose.isValidObjectId(updates.assigneeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignee ID",
        });
      }

      const isMember = await WorkspaceMember.exists({
        workspaceId,
        userId: updates.assigneeId,
      });

      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: "Assignee must belong to this workspace",
        });
      }
    }

    if (updates.dueDate !== undefined) {
      if (updates.dueDate === null || updates.dueDate === "") {
        updates.dueDate = null;
      } else {
        const parsed = new Date(updates.dueDate);

        if (!Number.isFinite(parsed.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid due date",
          });
        }

        updates.dueDate = parsed;
      }
    }

    

    const existingTask = await Task.findOne({
        _id: taskId,
        workspaceId,
        projectId,
    });

    if (!existingTask) {
    return res.status(404).json({
        success: false,
        message: "Task not found",
    });
    }
    const task = await Task.findOneAndUpdate(
      { _id: taskId, workspaceId, projectId },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("assigneeId", "name email");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }
    const io = req.app.get("io");

    if (io) {
        io.to(`workspace:${workspaceId}`).emit("task:updated", task);
    }

    const activityRecords = [];
    if (updates.status && updates.status !== existingTask.status) {
    activityRecords.push({
        workspaceId,
        projectId,
        taskId,
        actorId: req.userId,
        type: "task.status_changed",
        details: {
        from: existingTask.status,
        to: updates.status,
        },
    });
    }

    if (
    Object.prototype.hasOwnProperty.call(updates, "assigneeId") &&
    String(updates.assigneeId ?? "") !==
        String(existingTask.assigneeId ?? "")
    ) {
    activityRecords.push({
        workspaceId,
        projectId,
        taskId,
        actorId: req.userId,
        type: "task.assigned",
        details: {
        from: existingTask.assigneeId,
        to: updates.assigneeId,
        },
    });
    }

    const editedFields = ["title", "description", "priority", "dueDate"].filter(
      (field) => {
        if (!Object.prototype.hasOwnProperty.call(updates, field)) return false;
        const before = existingTask[field];
        const after = updates[field];
        return before instanceof Date || after instanceof Date
          ? (before ? before.getTime() : null) !== (after ? after.getTime() : null)
          : before !== after;
      }
    );

    if (editedFields.length) {
      activityRecords.push({
        workspaceId,
        projectId,
        taskId,
        actorId: req.userId,
        type: "task.updated",
        details: { fields: editedFields },
      });
    }

    if (activityRecords.length) {
        await Activity.insertMany(activityRecords);
    }

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req, res, next) {
  try {
    const { workspaceId, projectId, taskId } = req.params;

    const task = await Task.findOne({ _id: taskId, workspaceId, projectId });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const role = req.workspaceMembership.role;
    const isCreator = String(task.createdBy) === req.userId;

    if (!isCreator && !["owner", "admin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Only workspace admins or the task's creator can delete it",
      });
    }

    await task.deleteOne();

    // Remove everything that hung off the task.
    await Promise.all([
      Comment.deleteMany({ workspaceId, taskId }),
      Activity.deleteMany({ workspaceId, taskId }),
    ]);

    req.app
      .get("io")
      ?.to(`workspace:${workspaceId}`)
      .emit("task:deleted", { _id: taskId, projectId, workspaceId });

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
