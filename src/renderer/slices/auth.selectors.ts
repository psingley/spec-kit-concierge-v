import type { RootState } from '../store';

export const selectAuthState = (state: RootState) => state.auth;
export const selectAuthCopilotLoggedIn = (state: RootState) => state.auth.copilotLoggedIn;
export const selectAuthGithubLoggedIn = (state: RootState) => state.auth.githubLoggedIn;
