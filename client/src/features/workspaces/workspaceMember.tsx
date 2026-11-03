import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Mail,
  ShieldCheck,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";
import {
  getWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  type WorkspaceMember,
} from "../../services/workspaceMemeberService";
import { useWorkspaceEvents } from "../../hooks/useWorkspaceEvents";
import { getApiError } from "../../utils/errors";

interface WorkspaceMembersProps {
  workspaceId: string;
  currentUserId?: string;
  currentRole: "owner" | "admin" | "member";
  // Called after the current user leaves this workspace.
  onLeft: () => void;
}

export default function WorkspaceMembers({
  workspaceId,
  currentUserId,
  currentRole,
  onLeft,
}: WorkspaceMembersProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");

  const reload = useCallback(() => setRetryCount((count) => count + 1), []);

  useWorkspaceEvents(workspaceId, {
    "member:updated": reload,
    "member:removed": reload,
  });

  async function changeRole(member: WorkspaceMember, role: "admin" | "member") {
    setBusyId(member.id);
    setActionError("");

    try {
      await updateWorkspaceMemberRole(workspaceId, member.id, role);
      setMembers((current) =>
        current.map((item) => (item.id === member.id ? { ...item, role } : item))
      );
    } catch (err) {
      setActionError(getApiError(err, "Couldn't change that role."));
    } finally {
      setBusyId("");
    }
  }

  async function remove(member: WorkspaceMember) {
    const isSelf = member.id === currentUserId;
    const question = isSelf
      ? "Leave this workspace? You'll lose access to its projects."
      : `Remove ${member.name} from this workspace?`;

    if (!window.confirm(question)) return;

    setBusyId(member.id);
    setActionError("");

    try {
      await removeWorkspaceMember(workspaceId, member.id);

      if (isSelf) {
        onLeft();
      } else {
        setMembers((current) => current.filter((item) => item.id !== member.id));
      }
    } catch (err) {
      setActionError(getApiError(err, "Couldn't remove that member."));
    } finally {
      setBusyId("");
    }
  }

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      setError("");

      try {
        const data = await getWorkspaceMembers(workspaceId);

        if (!cancelled) {
          setMembers(data);
        }
      } catch (err) {
        console.error("Failed to load workspace members:", err);

        if (!cancelled) {
          setError("Couldn't load workspace members.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (workspaceId) {
      loadMembers();
    }

    return () => {
      cancelled = true;
    };
  }, [workspaceId, retryCount]);

  // Show the spinner again when switching to a different workspace.
  useEffect(() => {
    setLoading(true);
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-slate-400">
        <LoaderCircle size={18} className="animate-spin" />
        Loading workspace members...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
        <AlertCircle size={18} />
        {error}
        <button
          onClick={() => setRetryCount((count) => count + 1)}
          className="ml-auto underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-5 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Members</h2>
          <p className="mt-1 text-sm text-slate-400">
            People who belong to this workspace.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
          <Users size={16} />
          {members.length} {members.length === 1 ? "member" : "members"}
        </div>
      </div>

      {actionError && (
        <p role="alert" className="text-sm text-red-400">
          {actionError}
        </p>
      )}

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
          <Users className="mx-auto mb-3 text-slate-500" size={28} />
          <h3 className="font-medium">No members found</h3>
          <p className="mt-2 text-sm text-slate-400">
            Workspace members will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-[minmax(0,1fr)_170px] gap-4 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid-cols-[minmax(0,1fr)_170px_150px]">
            <span>Member</span>
            <span>Role</span>
            <span className="hidden sm:block">Joined</span>
          </div>

          {members.map((member) => (
            <div
              key={member.membershipId}
              className="grid grid-cols-[minmax(0,1fr)_170px] items-center gap-4 border-b border-white/[0.06] px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_170px_150px]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-400/15 font-semibold text-indigo-200">
                  {member.name.trim().charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {member.name}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                    <Mail size={12} />
                    {member.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {currentRole === "owner" && member.role !== "owner" ? (
                  <select
                    aria-label={`Role for ${member.name}`}
                    value={member.role}
                    disabled={busyId === member.id}
                    onChange={(event) =>
                      void changeRole(member, event.target.value as "admin" | "member")
                    }
                    className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs capitalize"
                  >
                    <option value="admin">admin</option>
                    <option value="member">member</option>
                  </select>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-xs capitalize text-slate-300">
                    {member.role === "owner" && <ShieldCheck size={12} />}
                    {member.role}
                  </span>
                )}

                {member.role !== "owner" &&
                  (member.id === currentUserId ||
                    currentRole === "owner" ||
                    (currentRole === "admin" && member.role === "member")) && (
                    <button
                      type="button"
                      disabled={busyId === member.id}
                      onClick={() => void remove(member)}
                      className="text-xs text-slate-400 hover:text-red-400 disabled:opacity-50"
                    >
                      {member.id === currentUserId ? "Leave" : "Remove"}
                    </button>
                  )}
              </div>

              <p className="hidden text-sm text-slate-400 sm:block">
                {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
