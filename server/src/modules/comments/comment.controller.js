import mongoose from "mongoose";
import Comment from "./comment.model.js";
import Activity from "../activity/activity.model.js";
import Task from "../tasks/task.model.js";

export async function getComments(req, res, next) {
  try {
    const { workspaceId, projectId, taskId } = req.params;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const taskExists = await Task.exists({
      _id: taskId,
      workspaceId,
      projectId,
    });

    if (!taskExists) {
      return res.status(404).json({
        success: false,
        message: "Task not found in this project",
      });
    }

    const comments = await Comment.find({
      workspaceId,
      projectId,
      taskId,
    })
      .populate("authorId", "name email")
      .sort({ createdAt: 1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      comments,
    });
  } catch (error) {
    next(error);
  }
}

export async function createComment(req, res, next) {
  try {
    const { workspaceId, projectId, taskId } = req.params;
    const { body } = req.body;

    if (
      typeof body !== "string" ||
      body.trim().length < 1 ||
      body.trim().length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message: "Comment must contain between 1 and 5000 characters",
      });
    }

    const task = await Task.findOne({
      _id: taskId,
      workspaceId,
      projectId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found in this project",
      });
    }

    const comment = await Comment.create({
      workspaceId,
      projectId,
      taskId,
      authorId: req.userId,
      body: body.trim(),
    });

    await Activity.create({
      workspaceId,
      projectId,
      taskId,
      actorId: req.userId,
      type: "comment.created",
      details: { commentId: comment._id },
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate("authorId", "name email");

    const io = req.app.get("io");

    if (io) {
      io.to(`workspace:${workspaceId}`).emit(
        "comment:created",
        populatedComment
      );
    }

    return res.status(201).json({
      success: true,
      comment: populatedComment,
    });
  } catch (error) {
    next(error);
  }
}

// The author, or a workspace owner/admin, can delete a comment.
export async function deleteComment(req, res, next) {
  try {
    const { workspaceId, projectId, taskId, commentId } = req.params;

    const comment = await Comment.findOne({
      _id: commentId,
      workspaceId,
      projectId,
      taskId,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const isAuthor = String(comment.authorId) === req.userId;
    const isAdmin = ["owner", "admin"].includes(req.workspaceMembership.role);

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments",
      });
    }

    await comment.deleteOne();

    req.app
      .get("io")
      ?.to(`workspace:${workspaceId}`)
      .emit("comment:deleted", { _id: commentId, taskId });

    return res.status(200).json({
      success: true,
      message: "Comment deleted",
    });
  } catch (error) {
    next(error);
  }
}
