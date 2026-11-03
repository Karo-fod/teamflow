import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../app/store";
import {
  fetchWorkspaces,
  setActiveWorkspace,
} from "../features/workspaces/workspaceSlice";

export default function WorkspaceSelector() {
  const dispatch = useDispatch<AppDispatch>();

  const { workspaces, activeWorkspace, isLoading, error } = useSelector(
    (state: RootState) => state.workspaces
  );

  useEffect(() => {
    void dispatch(fetchWorkspaces());
  }, [dispatch]);

  if (isLoading && workspaces.length === 0) {
    return <p className="text-sm text-slate-400">Loading workspaces...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (workspaces.length === 0) {
    return <p className="text-sm text-slate-400">No workspaces found.</p>;
  }

  return (
    <label className="flex items-center gap-3">
      <span className="text-sm text-slate-400">Workspace</span>

      <select
        className="rounded-lg border border-white/10 bg-slate-900 p-2"
        value={activeWorkspace?.id ?? ""}
        onChange={(event) =>
          dispatch(setActiveWorkspace(event.target.value))
        }
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    </label>
  );
}