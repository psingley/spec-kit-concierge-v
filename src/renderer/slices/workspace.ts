import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { stepOrder, type StepName } from './steps';

const laterStep = (left: StepName, right: StepName): StepName =>
  stepOrder.indexOf(left) >= stepOrder.indexOf(right) ? left : right;

const stepAfter = (step: StepName): StepName => {
  const index = stepOrder.indexOf(step);
  return stepOrder[Math.min(index + 1, stepOrder.length - 1)] ?? step;
};

// Where a resumed session should land: the FIRST step that is not complete.
// (e.g. specify complete + clarify pending -> 'clarify'.) When every step is
// complete the session is finished, so land on 'review'.
const firstIncompleteStep = (restoredStates: BranchSession['restoredStates']): StepName => {
  const incomplete = stepOrder.find((step) => restoredStates[step] !== 'complete');
  return incomplete ?? 'review';
};

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

export type RestoredStepCommits = Partial<Record<StepName, string>>;
export type RestoredStepFailure = {
  step: StepName;
  sessionId: string;
  failedAt: string;
  reason: string;
  strandedArtifacts: string[];
  anomalyIds: string[];
};
export type RestoredStepFailures = Partial<Record<StepName, RestoredStepFailure>>;

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
  restoredStepCommits: RestoredStepCommits;
  restoredFailures?: RestoredStepFailures;
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
      // Resume (restoredStates present) lands on the first incomplete step so the
      // user sees prior steps complete with their evidence. Start-new (no
      // restoredStates — a detached, not-yet-named session) keeps the original
      // 'specify' landing.
      const landed: StepName =
        action.payload.restoredStates !== undefined ? firstIncompleteStep(action.payload.restoredStates) : 'specify';
      state.activeStep = landed;
      state.viewedStep = landed;
      // maxReachedStep must be at least the landed step so the Stepper lets the
      // user move back through completed steps.
      state.maxReachedStep = landed;
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
    },
    clarifyCompletedInWorkspace: (state) => {
      state.activeStep = 'plan';
      state.maxReachedStep = 'plan';
      // Keep the user on the clarify done view; they click Plan in the stepper
      // to continue (mirrors specifyCompletedInWorkspace keeping viewedStep).
      state.viewedStep = 'clarify';
    },
    passiveStepCompletedInWorkspace: (state, action: PayloadAction<StepName>) => {
      state.maxReachedStep = laterStep(state.maxReachedStep, stepAfter(action.payload));
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
  specifyCompletedInWorkspace,
  clarifyCompletedInWorkspace,
  passiveStepCompletedInWorkspace
} = workspaceSlice.actions;
export const workspaceReducer = workspaceSlice.reducer;
export default workspaceReducer;
