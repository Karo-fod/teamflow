import Activity from "./activity.model.js";
import Task from "../tasks/task.model.js";

export async function getTaskActivity(req, res, next) {
  try {
    const { workspaceId, projectId, taskId } = req.params;

    const taskExists = await Task.exists({
      _id: taskId,
      workspaceId,
      projectId,
    });

    if (!taskExists) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const activities = await Activity.find({
      workspaceId,
      projectId,
      taskId,
    })
      .populate("actorId", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      activities,
    });
  } catch (error) {
    next(error);
  }
}