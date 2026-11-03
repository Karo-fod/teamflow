import api from "./api";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export async function getProfile(): Promise<UserProfile> {
  const response = await api.get("/auth/me");
  return response.data.user;
}

export async function updateProfile(
  name: string
): Promise<UserProfile> {
  const response = await api.patch("/auth/me", { name });
  return response.data.user;
}
