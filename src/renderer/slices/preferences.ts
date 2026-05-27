import { createSlice } from '@reduxjs/toolkit';

export type PreferencesState = {
  hydratedFromDisk: boolean;
  theme: 'system' | 'light' | 'dark';
};

export const preferencesInitialState: PreferencesState = {
  hydratedFromDisk: false,
  theme: 'system'
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: preferencesInitialState,
  reducers: {},
  extraReducers: () => {}
});

export const preferencesReducer = preferencesSlice.reducer;
export default preferencesReducer;
