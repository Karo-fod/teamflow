import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import api from "../../services/api";
import type { AuthState, User } from "./authTypes";

interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

interface Credentials {
  email: string;
  password: string;
}

interface RegisterCredentials extends Credentials {
  name: string;
}

const storedToken = localStorage.getItem("teamflow_token");

const initialState: AuthState = {
  user: null,
  token: storedToken,
  isInitializing: Boolean(storedToken),
  isLoading: false,
  error: null,
};

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      "Unable to connect to the server."
    );
  }

  return "Something went wrong.";
}

export const registerUser = createAsyncThunk<
  AuthResponse,
  RegisterCredentials,
  { rejectValue: string }
>("auth/register", async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post<AuthResponse>(
      "/auth/register",
      credentials
    );

    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const loginUser = createAsyncThunk<
  AuthResponse,
  Credentials,
  { rejectValue: string }
>("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post<AuthResponse>(
      "/auth/login",
      credentials
    );

    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

// Restores the signed-in user after a page refresh.
export const fetchCurrentUser = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>("auth/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ user: User }>("/auth/me");
    return response.data.user;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.isInitializing = false;
      state.error = null;
      localStorage.removeItem("teamflow_token");
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isInitializing = false;
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        // A 401 is handled globally (sign-out); other failures just stop the
        // loading state so the app stays usable.
        state.isInitializing = false;
      })
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitializing = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem("teamflow_token", action.payload.token);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Registration failed.";
      })
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitializing = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem("teamflow_token", action.payload.token);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Login failed.";
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;