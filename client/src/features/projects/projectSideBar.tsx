import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Archive, Pencil, Plus } from "lucide-react";
import api from "../../services/api";
import type { AppDispatch, RootState } from "../../app/store";
import {
  fetchWorkspaces,
  workspaceAdded,
} from "../workspaces/workspaceSlice";
import type { Workspace } from "../workspaces/workspaceTypes";
import { useWorkspaceEvents } from "../../hooks/useWorkspaceEvents";
import { getApiError } from "../../utils/errors";

interface Project {
  _id: string;
  name: string;
  description?: string;
  createdBy?: string;
}

interface Props {
  selectedWorkspaceId: string;
  selectedProjectId: string;
  onWorkspaceChange: (workspaceId: string) => void;
  onProjectChange: (projectId: string) => void;
}

export default function ProjectSidebar({
  selectedWorkspaceId,
  selectedProjectId,
  onWorkspaceChange,
  onProjectChange,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { workspaces, isLoading: loadingWorkspaces, error: workspaceError } =
    useSelector((state: RootState) => state.workspaces);

  // Projects are stored together with the workspace they belong to, so a
  // stale list is never shown (or auto-selected) after switching workspace.
  const [projectData, setProjectData] = useState<{
    workspaceId: string;
    items: Project[];
  }>({ workspaceId: "", items: [] });
  const [reloadKey, setReloadKey] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [showWorkspaceForm, setShowWorkspaceForm] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [error, setError] = useState("");

  const projectsLoaded = projectData.workspaceId === selectedWorkspaceId;
  const projects = projectsLoaded ? projectData.items : [];

  const currentWorkspace: Workspace | undefined = workspaces.find(
    (workspace) => workspace.id === selectedWorkspaceId
  );
  const isAdmin =
    currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";

  useEffect(() => {
    void dispatch(fetchWorkspaces());
  }, [dispatch]);

  // Pick a valid workspace when none (or a removed one) is selected.
  useEffect(() => {
    if (
      workspaces.length > 0 &&
      !workspaces.some((workspace) => workspace.id === selectedWorkspaceId)
    ) {
      onWorkspaceChange(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId, onWorkspaceChange]);

  useEffect(() => {
    if (!selectedWorkspaceId) return;

    let cancelled = false;

    api
      .get<{ projects: Project[] }>(`/workspaces/${selectedWorkspaceId}/projects`)
      .then((response) => {
        if (cancelled) return;
        setProjectData({
          workspaceId: selectedWorkspaceId,
          items: [...response.data.projects].reverse(),
        });
      })
      .catch((err) => {
        if (!cancelled) setError(getApiError(err, "Failed to load projects."));
      });

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId, reloadKey]);

  // Keep the selection valid: first project by default, none when empty.
  useEffect(() => {
    if (!projectsLoaded) return;

    if (projects.length === 0) {
      if (selectedProjectId) onProjectChange("");
    } else if (!projects.some((project) => project._id === selectedProjectId)) {
      onProjectChange(projects[0]._id);
    }
  }, [projectsLoaded, projects, selectedProjectId, onProjectChange]);

  const reloadProjects = useCallback(() => setReloadKey((key) => key + 1), []);

  // Other people creating / renaming / archiving projects.
  useWorkspaceEvents(selectedWorkspaceId, {
    "project:created": reloadProjects,
    "project:updated": reloadProjects,
    "project:archived": reloadProjects,
  });

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = projectName.trim();
    if (!name || !selectedWorkspaceId) return;

    setCreatingProject(true);
    setError("");

    try {
      const response = await api.post<{ project: Project }>(
        `/workspaces/${selectedWorkspaceId}/projects`,
        { name }
      );

      const project = response.data.project;

      setProjectData((current) =>
        current.workspaceId === selectedWorkspaceId &&
        !current.items.some((item) => item._id === project._id)
          ? { ...current, items: [...current.items, project] }
          : current
      );
      setProjectName("");
      onProjectChange(project._id);
    } catch (err) {
      setError(getApiError(err, "Failed to create project."));
    } finally {
      setCreatingProject(false);
    }
  }

  async function createWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = workspaceName.trim();
    if (name.length < 2) return;

    setCreatingWorkspace(true);
    setError("");

    try {
      const response = await api.post<{ workspace: Workspace }>("/workspaces", {
        name,
      });

      dispatch(workspaceAdded(response.data.workspace));
      onWorkspaceChange(response.data.workspace.id);
      setWorkspaceName("");
      setShowWorkspaceForm(false);
    } catch (err) {
      setError(getApiError(err, "Failed to create workspace."));
    } finally {
      setCreatingWorkspace(false);
    }
  }

  async function renameProject(project: Project) {
    const name = window.prompt("Rename project", project.name)?.trim();
    if (!name || name === project.name) return;

    try {
      setError("");
      await api.patch(`/workspaces/${selectedWorkspaceId}/projects/${project._id}`, {
        name,
      });
      reloadProjects();
    } catch (err) {
      setError(getApiError(err, "Failed to rename project."));
    }
  }

  async function archiveProject(project: Project) {
    if (
      !window.confirm(
        `Archive "${project.name}"? It will disappear from the sidebar.`
      )
    ) {
      return;
    }

    try {
      setError("");
      await api.delete(`/workspaces/${selectedWorkspaceId}/projects/${project._id}`);
      reloadProjects();
    } catch (err) {
      setError(getApiError(err, "Failed to archive project."));
    }
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-[#0d121f] p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <h2 className="mb-6 text-xl font-bold tracking-tight">
        <span className="text-indigo-400">Team</span>Flow
      </h2>

      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor="workspace-select"
          className="text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          Workspace
        </label>
        <button
          type="button"
          onClick={() => setShowWorkspaceForm((open) => !open)}
          aria-label="New workspace"
          className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <Plus size={14} />
        </button>
      </div>

      {loadingWorkspaces && workspaces.length === 0 ? (
        <p className="text-sm text-slate-400">Loading workspaces...</p>
      ) : workspaceError ? (
        <div className="text-sm text-red-400">
          <p>{workspaceError}</p>
          <button
            type="button"
            onClick={() => void dispatch(fetchWorkspaces())}
            className="mt-2 underline"
          >
            Try again
          </button>
        </div>
      ) : workspaces.length === 0 ? (
        <p className="text-sm text-slate-400">No workspaces found.</p>
      ) : (
        <select
          id="workspace-select"
          value={selectedWorkspaceId}
          onChange={(event) => onWorkspaceChange(event.target.value)}
          className="w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-sm"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      )}

      {showWorkspaceForm && (
        <form onSubmit={createWorkspace} className="mt-2 space-y-2">
          <input
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="New workspace name"
            minLength={2}
            maxLength={80}
            required
            className="w-full rounded-lg border border-white/10 bg-slate-950 p-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={creatingWorkspace}
            className="w-full rounded-lg bg-indigo-500 px-3 py-2 text-sm disabled:opacity-50"
          >
            {creatingWorkspace ? "Creating..." : "Create workspace"}
          </button>
        </form>
      )}

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Projects
        </h3>
      </div>

      {!projectsLoaded ? (
        <p className="text-sm text-slate-400">Loading projects...</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-slate-500">No projects yet.</p>
      ) : (
        <nav className="space-y-1">
          {projects.map((project) => {
            const canManage = isAdmin || project.createdBy === userId;
            const selected = selectedProjectId === project._id;

            return (
              <div
                key={project._id}
                className={`group flex items-center rounded-lg transition ${
                  selected
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onProjectChange(project._id)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left text-sm"
                >
                  <span className="text-lg">#</span>
                  <span className="truncate">{project.name}</span>
                </button>

                {canManage && (
                  <span className="flex pr-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label={`Rename ${project.name}`}
                      onClick={() => void renameProject(project)}
                      className="rounded p-1 hover:bg-white/10"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Archive ${project.name}`}
                      onClick={() => void archiveProject(project)}
                      className="rounded p-1 hover:bg-white/10"
                    >
                      <Archive size={13} />
                    </button>
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      )}

      <form onSubmit={createProject} className="mt-4 space-y-2">
        <input
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder="New project name"
          maxLength={100}
          className="w-full rounded-lg border border-white/10 bg-slate-950 p-2.5 text-sm"
        />

        <button
          type="submit"
          disabled={creatingProject || !projectName.trim() || !selectedWorkspaceId}
          className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
        >
          {creatingProject ? "Creating..." : "+ Create project"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
    </aside>
  );
}
