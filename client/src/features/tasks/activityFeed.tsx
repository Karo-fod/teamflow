import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import type { WorkspaceMember } from "../../services/workspaceMemeberService";
import { useWorkspaceEvents } from "../../hooks/useWorkspaceEvents";
import { getApiError } from "../../utils/errors";
import type { ActivityItem } from "./taskTypes";

interface Props {
  workspaceId: string;
  projectId: string;
  taskId: string;
  members: WorkspaceMember[];
}

const statusLabels: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export default function ActivityFeed({
  workspaceId,
  projectId,
  taskId,
  members,
}: Props) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const response = await api.get<{ activities: ActivityItem[] }>(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/activity`
      );
      setItems(response.data.activities);
    } catch (err) {
      setError(getApiError(err, "Failed to load activity."));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId, taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  useWorkspaceEvents(workspaceId, {
    "task:updated": (task: { _id: string }) => {
      if (String(task._id) === taskId) void load();
    },
    "comment:created": (comment: { taskId: string }) => {
      if (String(comment.taskId) === taskId) void load();
    },
  });

  function memberName(id?: string | null) {
    if (!id) return "nobody";
    return members.find((member) => member.id === id)?.name ?? "a former member";
  }

  function describe(item: ActivityItem): string {
    switch (item.type) {
      case "task.created":
        return "created this task";
      case "task.status_changed":
        return `moved it from ${statusLabels[item.details?.from ?? ""] ?? "?"} to ${
          statusLabels[item.details?.to ?? ""] ?? "?"
        }`;
      case "task.assigned":
        return item.details?.to
          ? `assigned it to ${memberName(item.details.to)}`
          : "unassigned it";
      case "task.updated":
        return `edited ${(item.details?.fields ?? ["the task"]).join(", ")}`;
      case "comment.created":
        return "added a comment";
      default:
        return "updated the task";
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading activity...</p>;

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-400">
        {error}
      </p>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No activity yet.</p>;
  }

  return (
    <ol className="max-h-80 space-y-3 overflow-y-auto">
      {items.map((item) => (
        <li key={item._id} className="flex items-start justify-between gap-3 text-sm">
          <p className="text-slate-300">
            <span className="font-medium text-slate-100">
              {item.actorId?.name ?? "Someone"}
            </span>{" "}
            {describe(item)}
          </p>
          <time className="shrink-0 text-xs text-slate-500">
            {new Date(item.createdAt).toLocaleString()}
          </time>
        </li>
      ))}
    </ol>
  );
}
