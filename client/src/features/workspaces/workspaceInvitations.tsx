import { useCallback, useEffect, useState } from "react";
import {
  MailPlus,
  X,
  Clock,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import {
  getWorkspaceInvitations,
  inviteWorkspaceMember,
  revokeWorkspaceInvitation,
  type WorkspaceInvitation,
} from "../../services/workspaceInvitationService";
import { getApiError } from "../../utils/errors";

interface WorkspaceInvitationsProps {
  workspaceId: string;
  // Only the owner can invite admins.
  isOwner: boolean;
}

export default function WorkspaceInvitations({
  workspaceId,
  isOwner,
}: WorkspaceInvitationsProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const loadInvitations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getWorkspaceInvitations(workspaceId);
      setInvitations(data);
    } catch (err) {
      console.error("Failed to load invitations:", err);
      setError("Couldn't load invitations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations, retryCount]);

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter an email address.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await inviteWorkspaceMember(workspaceId, normalizedEmail, role);
      setEmail("");
      setSuccess(result?.message ?? `Invitation sent to ${normalizedEmail}.`);
      await loadInvitations();
    } catch (err) {
      setError(
        getApiError(err, "Couldn't create the invitation. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (invitation: WorkspaceInvitation) => {
    const id = invitation.id ?? invitation._id;
    if (!id || !window.confirm(`Revoke the invitation for ${invitation.email}?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await revokeWorkspaceInvitation(workspaceId, id);
      setInvitations((current) =>
        current.filter((item) => (item.id ?? item._id) !== id)
      );
    } catch (err) {
      setError(getApiError(err, "Couldn't revoke the invitation."));
    }
  };

  return (
    <section className="space-y-4 text-slate-100">
      <div>
        <h2 className="text-xl font-semibold">Invite teammates</h2>
        <p className="mt-1 text-sm text-slate-400">
          Invite people to collaborate in this workspace.
        </p>
      </div>

      <form
        onSubmit={handleInvite}
        className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-5"
      >
        <div>
          <label
            htmlFor="invite-email"
            className="mb-2 block text-sm text-slate-300"
          >
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@example.com"
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-indigo-300"
          />
        </div>

        <div>
          <label
            htmlFor="invite-role"
            className="mb-2 block text-sm text-slate-300"
          >
            Workspace role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "admin" | "member")
            }
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm"
          >
            <option value="member">Member</option>
            {isOwner && <option value="admin">Admin</option>}
          </select>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="text-sm text-emerald-400">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !workspaceId}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-200 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <MailPlus size={16} />
          )}
          {submitting ? "Sending..." : "Send invitation"}
        </button>

        <p className="text-xs text-slate-500">
          We'll email them a link that's valid for 7 days. They must sign in
          (or sign up) with this same email address to join.
        </p>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Pending invitations</h3>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            disabled={loading}
            aria-label="Refresh invitations"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-5 text-sm text-slate-400">
            <LoaderCircle size={16} className="animate-spin" />
            Loading invitations...
          </div>
        ) : error && invitations.length === 0 ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : invitations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
            <MailPlus
              size={24}
              className="mx-auto mb-2 text-slate-500"
            />
            <p className="text-sm text-slate-300">
              No pending invitations
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Invitations you create will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10">
            {invitations.map((invitation) => (
              <div
                key={invitation.id ?? invitation._id ?? invitation.email}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {invitation.email}
                  </p>
                  <p className="mt-1 text-xs capitalize text-slate-400">
                    {invitation.role}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    Expires{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRevoke(invitation)}
                    aria-label={`Revoke invitation for ${invitation.email}`}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/5 hover:text-red-400"
                  >
                    <X size={14} /> Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
