import { useEffect } from "react";
import { connectSocket } from "../../services/socket";
import type { Task } from "./taskTypes";

export function useTaskUpdates(
  workspaceId: string,
  projectId: string,
  onRefresh: () => void
) {
  useEffect(() => {
    const token = localStorage.getItem("teamflow_token");
    if (!token || !workspaceId || !projectId) return;

    const socket = connectSocket(token);

    const joinWorkspace = () => {
      socket.emit("workspace:join", workspaceId, (result: {
        success: boolean;
        message?: string;
      }) => {
        if (!result.success) {
          console.error(result.message);
        }
      });
    };

    const onTaskUpdated = (task: Task & { projectId: string }) => {
      if (String(task.projectId) === projectId) {
        onRefresh();
      }
    };

    socket.on("connect", joinWorkspace);
    socket.on("task:updated", onTaskUpdated);

    if (socket.connected) joinWorkspace();

    return () => {
      socket.off("connect", joinWorkspace);
      socket.off("task:updated", onTaskUpdated);
    };
  }, [workspaceId, projectId, onRefresh]);
}