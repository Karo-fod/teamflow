import api from "./api";

export interface WorkspaceInvitation {
  _id?: string;
  id?: string;
  email: string;
  role: "admin" | "member";
  expiresAt: string;
  createdAt?: string;
}

export async function inviteWorkspaceMember(
  workspaceId: string,
  email: string,
  role: "admin" | "member"
) {
  const response = await api.post(
    `/workspaces/${workspaceId}/invitations`,
    { email, role }
  );

  return response.data;
}

export async function getWorkspaceInvitations(
  workspaceId: string
): Promise<WorkspaceInvitation[]> {
  const response = await api.get(
    `/workspaces/${workspaceId}/invitations`
  );

  return response.data.invitations;
}

export async function revokeWorkspaceInvitation(
  workspaceId: string,
  invitationId: string
) {
  await api.delete(
    `/workspaces/${workspaceId}/invitations/${invitationId}`
  );
}

export interface AcceptInvitationResult {
  workspaceId: string;
  workspace?: { id: string; name: string; slug: string };
  role: "admin" | "member";
}

export async function acceptWorkspaceInvitation(
  token: string
): Promise<AcceptInvitationResult> {
  const response = await api.post("/workspace-invitations/accept", { token });
  return response.data;
}
