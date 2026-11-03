import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  getWorkspaceMembers,
  type WorkspaceMember,
} from "../../services/workspaceMemeberService";
import { getApiError } from "../../utils/errors";
import type { Task, TaskPriority, TaskStatus } from "./taskTypes";
import CommentPanel from "./commentPanel";
import ActivityFeed from "./activityFeed";

interface Props {
  task: Task;
  workspaceId: string;
  projectId: string;
  currentUserId?: string;
  canModerate: boolean;
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

const statuses: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : "");

export default function TaskDetailModal({
  task,
  workspaceId,
  projectId,
  currentUserId,
  canModerate,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId?._id ?? "");
  const [dueDate, setDueDate] = useState(toDateInput(task.dueDate));
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [tab, setTab] = useState<"comments" | "activity">("comments");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const canDelete = canModerate || task.createdBy === currentUserId;
  const taskUrl = `/workspaces/${workspaceId}/projects/${projectId}/tasks/${task._id}`;

  // Re-sync the form when the task changes (e.g. edited by a teammate).
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setPriority(task.priority);
    setAssigneeId(task.assigneeId?._id ?? "");
    setDueDate(toDateInput(task.dueDate));
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task._id, task.updatedAt]);

  useEffect(() => {
    let cancelled = false;

    getWorkspaceMembers(workspaceId)
      .then((items) => {
        if (!cancelled) setMembers(items);
      })
      .catch(() => {
        // The assignee list is optional; the rest of the form still works.
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Close with Escape.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await api.patch<{ task: Task }>(taskUrl, {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      });

      onTaskUpdated(response.data.task);
      onClose();
    } catch (err) {
      setError(getApiError(err, "Failed to update task."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");

    try {
      await api.delete(taskUrl);
      onTaskDeleted(task._id);
      onClose();
    } catch (err) {
      setError(getApiError(err, "Failed to delete task."));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  const fieldClass =
    "w-full rounded-lg border border-white/10 bg-slate-950 p-3";
  const labelClass = "mb-2 block text-sm text-slate-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1326] p-6 text-slate-100 shadow-2xl"
      >
        <header className="mb-6 flex items-center justify-between gap-4">
          <h2 id="task-modal-title" className="text-xl font-semibold">
            Task details
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
          >
            Close
          </button>
        </header>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label htmlFor="task-title" className={labelClass}>
              Task title
            </label>
            <input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="task-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={10000}
              placeholder="Describe the task..."
              className={`${fieldClass} resize-y`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="task-status" className={labelClass}>
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
                className={fieldClass}
              >
                {statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-priority" className={labelClass}>
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                className={fieldClass}
              >
                {priorities.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-assignee" className={labelClass}>
                Assignee
              </label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
                {/* Keep the current assignee selectable until members load. */}
                {assigneeId && !members.some((m) => m.id === assigneeId) && (
                  <option value={assigneeId}>{task.assigneeId?.name}</option>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="task-due" className={labelClass}>
                Due date
              </label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {canDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-300">Delete this task?</span>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void handleDelete()}
                    className="rounded-lg bg-red-500/90 px-3 py-2 font-medium disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-white/10 px-3 py-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg border border-red-400/30 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10"
                >
                  Delete task
                </button>
              )
            ) : (
              <span />
            )}

            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="rounded-lg bg-indigo-500 px-5 py-2.5 font-medium hover:bg-indigo-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="mb-4 flex gap-2" role="tablist">
            {(["comments", "activity"] as const).map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={tab === name}
                onClick={() => setTab(name)}
                className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
                  tab === name
                    ? "bg-indigo-500/20 text-indigo-200"
                    : "text-slate-400 hover:bg-white/5"
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {tab === "comments" ? (
            <CommentPanel
              workspaceId={workspaceId}
              projectId={projectId}
              taskId={task._id}
              currentUserId={currentUserId}
              canModerate={canModerate}
            />
          ) : (
            <ActivityFeed
              workspaceId={workspaceId}
              projectId={projectId}
              taskId={task._id}
              members={members}
            />
          )}
        </div>
      </section>
    </div>
  );
}
