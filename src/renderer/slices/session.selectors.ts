import type { RootState } from '../store';

export const selectSessionState = (state: RootState) => state.session;
export const selectSessionActiveSessionId = (state: RootState) => state.session.activeSessionId;
export const selectSessionModelId = (state: RootState) => state.session.modelId;
export const selectSessionModeId = (state: RootState) => state.session.modeId;
