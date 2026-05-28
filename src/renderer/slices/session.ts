import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type SessionState = {
  activeSessionId: string | null;
  modelId: string | null;
  modeId: string | null;
  specifyPrompt: string;
  specifyRunning: boolean;
  specifyStarted: boolean;
  specMarkdown: string;
  artifactPath: string | null;
  commitSha: string | null;
  scrollProgress: number;
  failureReason: string | null;
};

export const sessionInitialState: SessionState = {
  activeSessionId: null,
  modelId: null,
  modeId: null,
  specifyPrompt: '',
  specifyRunning: false,
  specifyStarted: false,
  specMarkdown: '',
  artifactPath: null,
  commitSha: null,
  scrollProgress: 0,
  failureReason: null
};

const sessionSlice = createSlice({
  name: 'session',
  initialState: sessionInitialState,
  reducers: {
    specifyPromptChanged: (state, action: PayloadAction<string>) => {
      state.specifyPrompt = action.payload;
    },
    specifyRunStarted: (state, action: PayloadAction<{ sessionId: string; modelId?: string | null }>) => {
      state.activeSessionId = action.payload.sessionId;
      state.modelId = action.payload.modelId ?? state.modelId;
      state.specifyStarted = true;
      state.specifyRunning = true;
      state.failureReason = null;
    },
    specifyRunProgressed: (state) => {
      state.specifyStarted = true;
      state.specifyRunning = true;
    },
    specifyRunSucceeded: (
      state,
      action: PayloadAction<{ specMarkdown: string; artifactPath: string; commitSha: string }>
    ) => {
      state.specifyRunning = false;
      state.specifyStarted = true;
      state.specMarkdown = action.payload.specMarkdown;
      state.artifactPath = action.payload.artifactPath;
      state.commitSha = action.payload.commitSha;
      state.failureReason = null;
    },
    specifyRunFailed: (state, action: PayloadAction<{ reason: string }>) => {
      state.specifyRunning = false;
      state.specifyStarted = true;
      state.failureReason = action.payload.reason;
    },
    specifyScrollProgressChanged: (state, action: PayloadAction<number>) => {
      state.scrollProgress = Math.max(0, Math.min(1, action.payload));
    }
  },
  extraReducers: () => {}
});

export const {
  specifyPromptChanged,
  specifyRunStarted,
  specifyRunProgressed,
  specifyRunSucceeded,
  specifyRunFailed,
  specifyScrollProgressChanged
} = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
export default sessionReducer;
