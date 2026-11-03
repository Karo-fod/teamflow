import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import type { Task, TaskStatus } from "./taskTypes";
import TaskDetailModal from "./taskDetailModel";
import { useWorkspaceEvents } from "../../hooks/useWorkspaceEvents";
import { getApiError } from "../../utils/errors";
import { formatDueDate, isOverdue, priorityStyles } from "./taskUi";

interface Props {
  workspaceId: string;
  projectId: string;
  currentUserId?: string;
  // Owners and admins can moderate (delete) everyone's tasks and comments.
  canModerate: boolean;
}

const columns: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
];

export default function TaskBoard({
  workspaceId,
  projectId,
  currentUserId,
  canModerate,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const baseUrl = `/workspaces/${workspaceId}/projects/${projectId}/tasks`;

  const selectedTask = tasks.find((task) => task._id === selectedTaskId) ?? null;

  const loadTasks = useCallback(async () => {
    try {
      setError("");
      const response = await api.get<{ tasks: Task[] }>(baseUrl);
      setTasks(response.data.tasks);
    } catch (err) {
      setError(getApiError(err, "Failed to load tasks."));
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const upsertTask = useCallback((task: Task) => {
    setTasks((current) =>
      current.some((item) => item._id === task._id)
        ? current.map((item) => (item._id === task._id ? task : item))
        : [task, ...current]
    );
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setTasks((current) => current.filter((task) => task._id !== taskId));
    setSelectedTaskId((current) => (current === taskId ? null : current));
  }, []);

  // Live updates from teammates.
  useWorkspaceEvents(workspaceId, {
    "task:created": (task: Task) => {
      if (String(task.projectId) === projectId) upsertTask(task);
    },
    "task:updated": (task: Task) => {
      if (String(task.projectId) === projectId) upsertTask(task);
    },
    "task:deleted": (payload: { _id: string; projectId: string }) => {
      if (String(payload.projectId) === projectId) removeTask(payload._id);
    },
    // Someone left or was removed: their tasks became unassigned.
    "member:removed": () => void loadTasks(),
  });

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newTitle.trim();
    if (!title) return;

    try {
      setError("");

      const response = await api.post<{ task: Task }>(baseUrl, {
        title,
        priority: "medium",
      });

      upsertTask(response.data.task);
      setNewTitle("");
    } catch (err) {
      setError(getApiError(err, "Failed to create task."));
    }
  }

  async function moveTask(task: Task, status: TaskStatus) {
    if (task.status === status) return;

    const previousTasks = tasks;

    setTasks((current) =>
      current.map((item) =>
        item._id === task._id ? { ...item, status } : item
      )
    );

    try {
      await api.patch(`${baseUrl}/${task._id}`, { status });
    } catch (err) {
      setTasks(previousTasks);
      setError(getApiError(err, "Failed to update task."));
    }
  }

  const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };

  const filteredTasks = tasks
    .filter((task) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        task.title.toLowerCase().includes(query) ||
        (task.description ?? "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);

      if (sortBy === "priority") {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }

      return (
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
      );
    });

  if (loading) {
    return <p className="text-slate-400">Loading tasks...</p>;
  }

  const inputClass = "rounded-lg border border-white/10 bg-slate-900 p-3";

  return (
    <section className="space-y-5">
      <form onSubmit={addTask} className="flex gap-2">
        <input
          className={`min-w-0 flex-1 ${inputClass}`}
          placeholder="Add a task..."
          value={newTitle}
          maxLength={200}
          onChange={(event) => setNewTitle(event.target.value)}
          required
        />
        <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-2">
          Add task
        </button>
      </form>

      {tasks.length === 0 && (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-8 text-center">
          <h3 className="text-lg font-semibold text-white">Your board is ready</h3>

          <p className="mt-2 text-sm text-slate-400">
            Create your first task to start organizing your work.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Search tasks..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={inputClass}
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className={inputClass}
        >
          <option value="all">All statuses</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
          className={inputClass}
        >
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className={inputClass}
        >
          <option value="newest">Newest first</option>
          <option value="title">Title A–Z</option>
          <option value="priority">Highest priority</option>
        </select>
      </div>

      <p className="text-sm text-slate-400">
        Showing {filteredTasks.length} of {tasks.length} tasks
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {columns.map((column) => {
          const columnTasks = filteredTasks.filter(
            (task) => task.status === column.id
          );

          return (
            <div
              key={column.id}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(column.id);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragOver(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(null);

                const task = tasks.find(
                  (item) => item._id === event.dataTransfer.getData("text/plain")
                );

                if (task) void moveTask(task, column.id);
              }}
              className={`min-h-64 rounded-xl border bg-slate-900/60 p-3 transition ${
                dragOver === column.id
                  ? "border-indigo-400 bg-indigo-500/10"
                  : "border-white/10"
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">{column.label}</h2>
                <span className="text-sm text-slate-400">{columnTasks.length}</span>
              </div>

              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <article
                    key={task._id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", task._id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragOver(null)}
                    onClick={() => setSelectedTaskId(task._id)}
                    className={`cursor-pointer rounded-lg border bg-slate-900 p-3 ${
                      selectedTaskId === task._id
                        ? "border-indigo-500"
                        : "border-white/10"
                    }`}
                  >
                    <p className="font-medium">{task.title}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 capitalize ${priorityStyles[task.priority]}`}
                      >
                        {task.priority}
                      </span>

                      {task.dueDate && (
                        <span
                          className={
                            isOverdue(task.dueDate, task.status === "done")
                              ? "text-red-400"
                              : "text-slate-400"
                          }
                        >
                          Due {formatDueDate(task.dueDate)}
                        </span>
                      )}

                      {task.assigneeId && (
                        <span
                          title={task.assigneeId.name}
                          className="ml-auto inline-flex items-center gap-1.5 text-slate-300"
                        >
                          <span className="flex size-5 items-center justify-center rounded-full bg-indigo-400/20 text-[10px] font-semibold text-indigo-200">
                            {task.assigneeId.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="max-w-24 truncate">
                            {task.assigneeId.name}
                          </span>
                        </span>
                      )}
                    </div>

                    <label
                      className="mt-3 block text-xs text-slate-400"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Move task
                      <select
                        className="mt-1 w-full rounded-md border border-white/10 bg-slate-950 p-2 text-sm text-slate-200"
                        value={task.status}
                        onChange={(event) =>
                          void moveTask(task, event.target.value as TaskStatus)
                        }
                      >
                        {columns.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}

                {columnTasks.length === 0 && (
                  <p className="py-5 text-center text-sm text-slate-500">
                    No tasks yet
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          workspaceId={workspaceId}
          projectId={projectId}
          currentUserId={currentUserId}
          canModerate={canModerate}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={upsertTask}
          onTaskDeleted={removeTask}
        />
      )}
    </section>
  );
}
