import type { RootState } from '../store';

export const selectWorkspaceState = (state: RootState) => state.workspace;
export const selectWorkspaceActiveRepoPath = (state: RootState) => state.workspace.activeRepoPath;
export const selectWorkspaceAgents = (state: RootState) => state.workspace.agents;
export const selectWorkspaceBranch = (state: RootState) => state.workspace.branch;
export const selectWorkspaceAhead = (state: RootState) => state.workspace.ahead;
export const selectWorkspaceBehind = (state: RootState) => state.workspace.behind;
export const selectWorkspaceDirty = (state: RootState) => state.workspace.dirty;
