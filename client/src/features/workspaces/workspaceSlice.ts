import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import api from "../../services/api";
import type { Workspace, WorkspaceState } from "./workspaceTypes";

interface WorkspaceResponse {
  success: boolean;
  workspaces: Workspace[];
}

export const fetchWorkspaces = createAsyncThunk<
  Workspace[],
  void,
  { rejectValue: string }
>("workspaces/fetch", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<WorkspaceResponse>("/workspaces");
    return response.data.workspaces;
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || "Failed to load workspaces."
      : "Something went wrong.";

    return rejectWithValue(message);
  }
});

const initialState: WorkspaceState = {
  workspaces: [],
  activeWorkspace: null,
  isLoading: false,
  error: null,
};

const workspaceSlice = createSlice({
  name: "workspaces",
  initialState,
  reducers: {
    workspaceAdded(state, action: { payload: Workspace }) {
      state.workspaces.push(action.payload);
    },
    setActiveWorkspace(state, action: { payload: string }) {
      state.activeWorkspace =
        state.workspaces.find((workspace) => workspace.id === action.payload) ??
        null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workspaces = action.payload;

        if (
          !state.activeWorkspace ||
          !action.payload.some(
            (workspace) => workspace.id === state.activeWorkspace?.id
          )
        ) {
          state.activeWorkspace = action.payload[0] ?? null;
        }
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to load workspaces.";
      });
  },
});

export const { setActiveWorkspace, workspaceAdded } = workspaceSlice.actions;
export default workspaceSlice.reducer;