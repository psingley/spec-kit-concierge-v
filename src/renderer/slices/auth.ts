import { createSlice } from '@reduxjs/toolkit';

export type AuthState = {
  copilotLoggedIn: boolean | null;
  githubLoggedIn: boolean | null;
};

export const authInitialState: AuthState = {
  copilotLoggedIn: null,
  githubLoggedIn: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState: authInitialState,
  reducers: {},
  extraReducers: () => {}
});

export const authReducer = authSlice.reducer;
export default authReducer;
