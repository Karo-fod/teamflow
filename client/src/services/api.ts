import axios from "axios";

export const UNAUTHORIZED_EVENT = "teamflow:unauthorized";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("teamflow_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// An expired or invalid token on any protected call signs the user out
// (the App component listens for this event).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error?.config?.url ?? "";
    const isAuthAttempt =
      url.startsWith("/auth/login") || url.startsWith("/auth/register");

    if (
      error?.response?.status === 401 &&
      !isAuthAttempt &&
      localStorage.getItem("teamflow_token")
    ) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    return Promise.reject(error);
  }
);

export default api;
