import { createSlice } from '@reduxjs/toolkit';

export type UiState = {
  theme: 'system' | 'light' | 'dark';
  sidebarOpen: boolean;
  activeView: string | null;
};

export const uiInitialState: UiState = {
  theme: 'system',
  sidebarOpen: true,
  activeView: null
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: uiInitialState,
  reducers: {},
  extraReducers: () => {}
});

export const uiReducer = uiSlice.reducer;
export default uiReducer;
