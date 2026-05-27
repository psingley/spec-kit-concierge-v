import { createSlice } from '@reduxjs/toolkit';

export type WorkspaceAgentSummary = {
  id: string;
  displayName: string;
  capabilities: string[];
};

export type WorkspaceState = {
  activeRepoPath: string | null;
  agents: WorkspaceAgentSummary[] | null;
  branch: string | null;
  ahead: number;
  behind: number;
  dirty: boolean;
};

export const workspaceInitialState: WorkspaceState = {
  activeRepoPath: null,
  agents: null,
  branch: null,
  ahead: 0,
  behind: 0,
  dirty: false
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState: workspaceInitialState,
  reducers: {},
  extraReducers: () => {}
});

export const workspaceReducer = workspaceSlice.reducer;
export default workspaceReducer;
