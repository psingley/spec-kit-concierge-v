import type { RootState } from '../store';
import { workspaceGatePrerequisites } from '../product/workspaceGatePrerequisites';

export const selectAuthState = (state: RootState) => state.auth;
export const selectAuthCopilotLoggedIn = (state: RootState) => state.auth.copilotLoggedIn;
export const selectAuthGithubLoggedIn = (state: RootState) => state.auth.githubLoggedIn;
export const selectAuthGithubStatus = (state: RootState) => state.auth.github;
export const selectAuthCopilotStatus = (state: RootState) => state.auth.copilot;
export const selectAuthAtlassianStatus = (state: RootState) => state.auth.atlassian;
export const selectAuthIdentity = (state: RootState) => state.auth.identity;
export const selectAuthLastError = (state: RootState) => state.auth.lastError;
export const selectAuthGateOpen = (state: RootState) =>
  workspaceGatePrerequisites.every((provider) => state.auth[provider] === 'ok');
  state.auth.github === 'ok' && state.auth.copilot === 'ok' && state.auth.atlassian === 'ok';
