import { createSlice } from '@reduxjs/toolkit';

export type SessionState = {
  activeSessionId: string | null;
  modelId: string | null;
  modeId: string | null;
};

export const sessionInitialState: SessionState = {
  activeSessionId: null,
  modelId: null,
  modeId: null
};

const sessionSlice = createSlice({
  name: 'session',
  initialState: sessionInitialState,
  reducers: {},
  extraReducers: () => {}
});

export const sessionReducer = sessionSlice.reducer;
export default sessionReducer;
