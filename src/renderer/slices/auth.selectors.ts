import type { RootState } from '../store';

export const selectAuthState = (state: RootState) => state.auth;
export const selectAuthCopilotLoggedIn = (state: RootState) => state.auth.copilotLoggedIn;
export const selectAuthGithubLoggedIn = (state: RootState) => state.auth.githubLoggedIn;
export const selectAuthGithubStatus = (state: RootState) => state.auth.github;
export const selectAuthCopilotStatus = (state: RootState) => state.auth.copilot;
export const selectAuthAtlassianStatus = (state: RootState) => state.auth.atlassian;
export const selectAuthIdentity = (state: RootState) => state.auth.identity;
export const selectAuthLastError = (state: RootState) => state.auth.lastError;
export const selectAuthGateOpen = (state: RootState) =>
  state.auth.github === 'ok' && state.auth.copilot === 'ok';
