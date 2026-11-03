import api from "./api";

export interface WorkspaceMember {
  id: string;
  membershipId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export const getWorkspaceMembers = async (
  workspaceId: string
): Promise<WorkspaceMember[]> => {
  const response = await api.get(
    `/workspaces/${workspaceId}/members`
  );

  return response.data.members;
};

export const updateWorkspaceMemberRole = async (
  workspaceId: string,
  userId: string,
  role: "admin" | "member"
) => {
  await api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role });
};

// Used both to remove someone and for "leave workspace" (userId = yourself).
export const removeWorkspaceMember = async (
  workspaceId: string,
  userId: string
) => {
  await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
};
