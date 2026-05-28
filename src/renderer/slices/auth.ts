import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AuthProviderStatus = 'unknown' | 'locked' | 'out' | 'starting' | 'ok' | 'error';
export type AuthIdentity = {
  login: string;
  displayName?: string;
  avatarUrl?: string;
};

export type AuthState = {
  copilotLoggedIn: boolean | null;
  githubLoggedIn: boolean | null;
  github: AuthProviderStatus;
  copilot: AuthProviderStatus;
  atlassian: AuthProviderStatus;
  identity: AuthIdentity | null;
  lastError: string | null;
};

export const authInitialState: AuthState = {
  copilotLoggedIn: null,
  githubLoggedIn: null,
  github: 'unknown',
  copilot: 'locked',
  atlassian: 'out',
  identity: null,
  lastError: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState: authInitialState,
  reducers: {
    authLoginStarted: (state, action: PayloadAction<{ provider: 'github' | 'copilot' | 'atlassian' }>) => {
      state[action.payload.provider] = 'starting';
      state.lastError = null;
    },
    githubLoginSucceeded: (state, action: PayloadAction<{ identity: AuthIdentity }>) => {
      state.github = 'ok';
      state.githubLoggedIn = true;
      state.identity = action.payload.identity;
      if (state.copilot === 'locked') {
        state.copilot = 'out';
      }
      state.lastError = null;
    },
    copilotLoginSucceeded: (state) => {
      if (state.github !== 'ok') {
        state.copilot = 'locked';
        state.copilotLoggedIn = false;
        return;
      }
      state.copilot = 'ok';
      state.copilotLoggedIn = true;
      state.lastError = null;
    },
    atlassianLoginSucceeded: (state) => {
      state.atlassian = 'ok';
      state.lastError = null;
    },
    authLoginFailed: (
      state,
      action: PayloadAction<{ provider: 'github' | 'copilot' | 'atlassian'; message: string }>
    ) => {
      state[action.payload.provider] = action.payload.provider === 'copilot' && state.github !== 'ok' ? 'locked' : 'error';
      if (action.payload.provider === 'github') {
        state.githubLoggedIn = false;
      }
      if (action.payload.provider === 'copilot') {
        state.copilotLoggedIn = false;
      }
      state.lastError = action.payload.message;
    },
    authStatusHydrated: (
      state,
      action: PayloadAction<{ githubLoggedIn: boolean | null; copilotLoggedIn: boolean | null }>
    ) => {
      state.githubLoggedIn = action.payload.githubLoggedIn;
      state.copilotLoggedIn = action.payload.copilotLoggedIn;
      state.github = action.payload.githubLoggedIn === true ? 'ok' : action.payload.githubLoggedIn === false ? 'out' : 'unknown';
      state.copilot =
        state.github !== 'ok' ? 'locked' : action.payload.copilotLoggedIn === true ? 'ok' : action.payload.copilotLoggedIn === false ? 'out' : 'unknown';
    }
  },
  extraReducers: () => {}
});

export const {
  authLoginStarted,
  githubLoginSucceeded,
  copilotLoginSucceeded,
  atlassianLoginSucceeded,
  authLoginFailed,
  authStatusHydrated
} = authSlice.actions;
export const authReducer = authSlice.reducer;
export default authReducer;
