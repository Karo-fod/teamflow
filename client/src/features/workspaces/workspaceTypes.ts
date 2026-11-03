export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
  createdAt?: string;
}

export interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
}