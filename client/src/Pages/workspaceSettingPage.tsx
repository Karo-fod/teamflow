import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../app/store";
import { ArrowLeft, Users, ChevronDown } from "lucide-react";
import WorkspaceMembers from "../features/workspaces/workspaceMember";
import WorkspaceInvitations from "../features/workspaces/workspaceInvitations";
import api from "../services/api";
import ProfileSettings from "../features/workspaces/profileSettings";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
}

export default function WorkspaceSettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>(
    location.state?.workspaceId || ""
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaces() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/workspaces");
        const items: Workspace[] = response.data.workspaces ?? [];

        if (cancelled) return;

        setWorkspaces(items);

        // Keep the workspace passed from the dashboard if it still exists.
        const requestedId = location.state?.workspaceId;
        const selectedExists = items.some(
          (workspace) => workspace.id === (requestedId || workspaceId)
        );

        if (selectedExists) {
          setWorkspaceId(requestedId || workspaceId);
        } else if (items.length > 0) {
          setWorkspaceId(items[0].id);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load your workspaces. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWorkspaces();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId
  );

  return (
    <main className="min-h-screen bg-[#060912] p-5 text-slate-100 md:p-8">
      <div className="mx-auto max-w-5xl">
        <button
            type="button"
            onClick={() =>
                navigate("/dashboard", {
                state: { workspaceId },
                })
            }
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
            <ArrowLeft size={16} />
            Back to dashboard
        </button>

        <header className="mb-8 flex items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <Users size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold">Members & Invites</h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage workspace members and invitations.
            </p>
          </div>
        </header>

        <section className="mb-8 max-w-xl rounded-2xl border border-white/10 bg-[#0d121f] p-5">
          <label
            htmlFor="workspace"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Active workspace
          </label>

          <div className="relative">
            <select
                id="workspace"
                value={workspaceId}
                onChange={(event) => {
                    const id = event.target.value;
                    setWorkspaceId(id);
                    localStorage.setItem("teamflow_workspace_id", id);
                }}
                disabled={loading || workspaces.length === 0}
                className="w-full appearance-none rounded-lg border border-white/10 bg-[#060912] px-4 py-3 pr-10 text-sm outline-none focus:border-[#c0c1ff] disabled:opacity-50"
            >
              {loading && <option value="">Loading workspaces...</option>}

              {!loading && workspaces.length === 0 && (
                <option value="">No workspaces available</option>
              )}

              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name} ({workspace.role})
                </option>
              ))}
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          {error && (
            <div className="mt-3">
              <p className="text-sm text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-[#c0c1ff] hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {selectedWorkspace && (
            <p className="mt-3 text-xs text-slate-500">
              Workspace: {selectedWorkspace.slug}
            </p>
          )}
        </section>

        {loading ? (
          <p className="text-sm text-slate-400">Loading settings...</p>
        ) : selectedWorkspace ? (
          <div className="space-y-8">
            <section className="mb-8 rounded-2xl border border-white/10 bg-[#0d121f] p-5 md:p-6">
                <h2 className="mb-5 font-semibold">Your profile</h2>
                <ProfileSettings />
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#0d121f] p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <Users size={20} className="text-[#c0c1ff]" />
                <h2 className="font-semibold">Workspace members</h2>
              </div>

              <WorkspaceMembers
                workspaceId={selectedWorkspace.id}
                currentUserId={currentUserId}
                currentRole={selectedWorkspace.role}
                onLeft={() => {
                  // Forget the workspace we just left; the dashboard picks another.
                  if (localStorage.getItem("teamflow_workspace_id") === selectedWorkspace.id) {
                    localStorage.removeItem("teamflow_workspace_id");
                  }
                  navigate("/dashboard", { replace: true });
                }}
              />
            </section>

            {selectedWorkspace.role !== "member" && (
              <section className="rounded-2xl border border-white/10 bg-[#0d121f] p-5 md:p-6">
                <h2 className="mb-2 font-semibold">Invitations</h2>
                <p className="mb-5 text-sm text-slate-400">
                  Invite teammates to collaborate in this workspace.
                </p>

                <WorkspaceInvitations
                  workspaceId={selectedWorkspace.id}
                  isOwner={selectedWorkspace.role === "owner"}
                />
              </section>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Select a workspace to manage its settings.
          </p>
        )}
      </div>
    </main>
  );
}
