export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskAssignee {
  _id: string;
  name: string;
  email: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  workspaceId: string;
  projectId: string;
  createdBy?: string;
  assigneeId?: TaskAssignee | null;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityItem {
  _id: string;
  type:
    | "task.created"
    | "task.updated"
    | "task.status_changed"
    | "task.assigned"
    | "comment.created";
  details?: {
    from?: string | null;
    to?: string | null;
    fields?: string[];
  };
  createdAt: string;
  actorId?: { _id: string; name: string; email: string } | null;
}
