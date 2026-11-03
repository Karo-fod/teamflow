import type { TaskPriority } from "./taskTypes";

export const priorityStyles: Record<TaskPriority, string> = {
  urgent: "bg-red-500/15 text-red-300",
  high: "bg-orange-500/15 text-orange-300",
  medium: "bg-indigo-500/15 text-indigo-300",
  low: "bg-slate-500/20 text-slate-300",
};

// Due dates are stored as UTC midnight, so format them in UTC to avoid the
// day shifting in time zones behind UTC.
export function formatDueDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function isOverdue(value: string, done: boolean): boolean {
  if (done) return false;

  const due = new Date(value);
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return due.getTime() < todayUtc;
}
