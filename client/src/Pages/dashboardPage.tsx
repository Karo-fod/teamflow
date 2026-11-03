import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import type { AppDispatch, RootState } from "../app/store";
import { logout } from "../features/auth/authSlice";
import { fetchWorkspaces } from "../features/workspaces/workspaceSlice";
import { useWorkspaceEvents } from "../hooks/useWorkspaceEvents";
import { disconnectSocket } from "../services/socket";
import TaskBoard from "../features/tasks/taskBoard";
import ProjectSidebar from "../features/projects/projectSideBar";


export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation()
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const workspaces = useSelector(
    (state: RootState) => state.workspaces.workspaces
  );
  const [projectId, setProjectId] = useState("");

  const [workspaceId, setWorkspaceId] = useState<string>(
    () =>
      location.state?.workspaceId ||
      localStorage.getItem("teamflow_workspace_id") ||
      ""
  );

  const handleWorkspaceChange = useCallback((id: string) => {
    setWorkspaceId(id);
    localStorage.setItem("teamflow_workspace_id", id);
    setProjectId("");
  }, []);

  useEffect(() => {
  if (workspaceId) {
    localStorage.setItem("teamflow_workspace_id", workspaceId);
  }
}, [workspaceId]);
  const handleProjectChange = useCallback((id: string) => {
    setProjectId(id);
  }, []);

  const role = workspaces.find((workspace) => workspace.id === workspaceId)?.role;

  // If we are removed from the workspace we're viewing, refresh the list so
  // the sidebar moves us to one we still belong to.
  useWorkspaceEvents(workspaceId, {
    "member:removed": (payload: { userId: string }) => {
      if (payload.userId === user?.id) void dispatch(fetchWorkspaces());
    },
  });

  function handleLogout() {
    disconnectSocket();
    dispatch(logout());
    navigate("/login");
  }

  return (
    <main className="min-h-screen bg-[#060912] text-slate-100 md:flex">
      <ProjectSidebar
        selectedWorkspaceId={workspaceId}
        selectedProjectId={projectId}
        onWorkspaceChange={handleWorkspaceChange}
        onProjectChange={handleProjectChange}
      />

      <section className="min-w-0 flex-1 p-5 md:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">
              {user?.name
                ? `Welcome, ${user.name}`
                : "Welcome to TeamFlow"}
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              Project workspace
            </h1>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/settings", {
                state : {workspaceId}
              })}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
            >
              <Users size={16} />
              Members
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
            >
              Sign out
            </button>
          </div>
        </header>

        {!workspaceId ? (
          <p className="text-slate-400">
            Select a workspace to get started.
          </p>
        ) : !projectId ? (
          <div className="rounded-xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold">
              Choose a project
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Select an existing project or create one from the sidebar.
            </p>
          </div>
        ) : (
          <TaskBoard
            key={`${workspaceId}:${projectId}`}
            workspaceId={workspaceId}
            projectId={projectId}
            currentUserId={user?.id}
            canModerate={role === "owner" || role === "admin"}
          />
        )}
      </section>
    </main>
  );
}
