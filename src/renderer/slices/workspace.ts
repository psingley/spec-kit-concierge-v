import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StepName } from './steps';

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
  selectedRepo: RepositorySummary | null;
  sessions: BranchSession[];
  activeStep: StepName;
  maxReachedStep: StepName;
  viewedStep: StepName;
  // True once workspaceEntered is dispatched (Start new session or Resume).
  // Distinguishes "repo card clicked" from "session entered" — the intermediate
  // browse screen (prior-session list + Start CTA) stays visible until this is true.
  sessionEntered: boolean;
};

export type RepositorySummary = {
  id: string;
  name: string;
  owner: string;
  path: string;
  defaultBranch: string;
  description?: string;
  language?: string;
  updatedAt?: string;
};

export type BranchSession = {
  // The worktree directory basename (ADR-0016): stable per-session key.
  sessionId: string;
  // The session's isolated worktree path. Resume enters the workspace pointed
  // here — no checkout in the clone (Phase 2).
  worktreePath: string;
  // null for a detached, not-yet-named worktree (spec-kit hasn't branched yet).
  branch: string | null;
  label: string;
  restoredStates: Record<StepName, 'not_available' | 'pending' | 'complete'>;
};

export const workspaceInitialState: WorkspaceState = {
  activeRepoPath: null,
  agents: null,
  branch: null,
  ahead: 0,
  behind: 0,
  dirty: false,
  selectedRepo: null,
  sessions: [],
  activeStep: 'specify',
  maxReachedStep: 'specify',
  viewedStep: 'specify',
  sessionEntered: false
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState: workspaceInitialState,
  reducers: {
    repositorySelected: (state, action: PayloadAction<RepositorySummary>) => {
      state.selectedRepo = action.payload;
      state.activeRepoPath = action.payload.path;
      state.branch = null;
      state.sessions = [];
      state.sessionEntered = false;
    },
    repositoryBrowseReset: (state) => {
      state.selectedRepo = null;
      state.activeRepoPath = null;
      state.branch = null;
      state.sessions = [];
      state.sessionEntered = false;
    },
    branchSessionsLoaded: (state, action: PayloadAction<BranchSession[]>) => {
      state.sessions = action.payload;
    },
    workspaceEntered: (
      state,
      // branch is nullable: a new (detached) session enters with no branch yet —
      // spec-kit names it later and branchUpdated sets it (ADR-0016). Resume
      // passes the known branch.
      action: PayloadAction<{ repo: RepositorySummary; branch: string | null; restoredStates?: BranchSession['restoredStates'] }>
    ) => {
      state.selectedRepo = action.payload.repo;
      state.activeRepoPath = action.payload.repo.path;
      state.branch = action.payload.branch;
      state.activeStep = 'specify';
      state.viewedStep = 'specify';
      state.maxReachedStep = action.payload.restoredStates?.clarify === 'pending' || action.payload.restoredStates?.specify === 'complete' ? 'clarify' : 'specify';
      state.sessionEntered = true;
    },
    branchUpdated: (state, action: PayloadAction<{ branch: string }>) => {
      state.branch = action.payload.branch;
    },
    workspaceStepViewed: (state, action: PayloadAction<StepName>) => {
      state.viewedStep = action.payload;
    },
    specifyCompletedInWorkspace: (state) => {
      state.activeStep = 'clarify';
      state.maxReachedStep = 'clarify';
      state.viewedStep = 'specify';
    }
  },
  extraReducers: () => {}
});

export const {
  repositorySelected,
  repositoryBrowseReset,
  branchSessionsLoaded,
  workspaceEntered,
  branchUpdated,
  workspaceStepViewed,
  specifyCompletedInWorkspace
} = workspaceSlice.actions;
export const workspaceReducer = workspaceSlice.reducer;
export default workspaceReducer;
