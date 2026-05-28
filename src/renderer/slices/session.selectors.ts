import type { RootState } from '../store';

export const selectSessionState = (state: RootState) => state.session;
export const selectSessionActiveSessionId = (state: RootState) => state.session.activeSessionId;
export const selectSessionModelId = (state: RootState) => state.session.modelId;
export const selectSessionModeId = (state: RootState) => state.session.modeId;
export const selectSessionSpecifyPrompt = (state: RootState) => state.session.specifyPrompt;
export const selectSessionSpecifyRunning = (state: RootState) => state.session.specifyRunning;
export const selectSessionSpecifyStarted = (state: RootState) => state.session.specifyStarted;
export const selectSessionSpecMarkdown = (state: RootState) => state.session.specMarkdown;
export const selectSessionArtifactPath = (state: RootState) => state.session.artifactPath;
export const selectSessionCommitSha = (state: RootState) => state.session.commitSha;
export const selectSessionScrollProgress = (state: RootState) => state.session.scrollProgress;
export const selectSessionFailureReason = (state: RootState) => state.session.failureReason;
export const selectSessionCanBeginSpecify = (state: RootState) =>
  state.session.specifyPrompt.trim().length > 0 && !state.session.specifyRunning;
