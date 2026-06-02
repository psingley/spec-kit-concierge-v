import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type JiraDryRunNode = {
  id: string;
  issueType: 'Epic' | 'Story' | 'Subtask';
  summary: string;
  parentId: string | null;
  labels: string[];
};

export type JiraDryRunPreview = {
  featureDir: string;
  stateDir: string;
  nodes: JiraDryRunNode[];
  warnings: string[];
};

export type JiraSubmissionResult = {
  nodeId: string;
  status: 'verified' | 'duplicate' | 'failed';
  issueKey?: string;
  issueUrl?: string;
};

export type JiraIssueLink = {
  key: string;
  url: string;
};

export type JiraState = {
  submitting: boolean;
  dryRunPreview: JiraDryRunPreview | null;
  results: JiraSubmissionResult[];
  issues: JiraIssueLink[];
  remaining: string[];
  error: string | null;
};

export const jiraInitialState: JiraState = {
  submitting: false,
  dryRunPreview: null,
  results: [],
  issues: [],
  remaining: [],
  error: null
};

const jiraSlice = createSlice({
  name: 'jira',
  initialState: jiraInitialState,
  reducers: {
    jiraDryRunPreviewLoaded: (state, action: PayloadAction<JiraDryRunPreview>) => {
      state.dryRunPreview = action.payload;
      state.error = null;
    },
    jiraSubmissionStarted: (state) => {
      state.submitting = true;
      state.results = [];
      state.issues = [];
      state.remaining = [];
      state.error = null;
    },
    jiraSubmissionResultRecorded: (state, action: PayloadAction<JiraSubmissionResult>) => {
      state.results.push(action.payload);
      if (action.payload.issueKey !== undefined && action.payload.issueUrl !== undefined) {
        state.issues.push({ key: action.payload.issueKey, url: action.payload.issueUrl });
      }
    },
    jiraSubmissionSucceeded: (state, action: PayloadAction<{ issues: JiraIssueLink[] }>) => {
      state.submitting = false;
      state.issues = action.payload.issues;
      state.remaining = [];
      state.error = null;
    },
    jiraSubmissionFailed: (state, action: PayloadAction<{ message: string; remaining?: string[] }>) => {
      state.submitting = false;
      state.remaining = action.payload.remaining ?? [];
      state.error = action.payload.message;
    },
    jiraSubmissionCleared: (state) => {
      state.dryRunPreview = null;
      state.results = [];
      state.issues = [];
      state.remaining = [];
      state.error = null;
      state.submitting = false;
    }
  }
});

export const {
  jiraDryRunPreviewLoaded,
  jiraSubmissionStarted,
  jiraSubmissionResultRecorded,
  jiraSubmissionSucceeded,
  jiraSubmissionFailed,
  jiraSubmissionCleared
} = jiraSlice.actions;

export const jiraReducer = jiraSlice.reducer;
export default jiraReducer;
