import { createSlice } from '@reduxjs/toolkit';

export type ActivityEntry = {
  id: string;
  timestamp: string;
  level: string;
  message: string;
};

export type ActivityState = {
  entries: ActivityEntry[];
  cap: 256;
};

export const activityInitialState: ActivityState = {
  entries: [],
  cap: 256
};

const activitySlice = createSlice({
  name: 'activity',
  initialState: activityInitialState,
  reducers: {},
  extraReducers: () => {}
});

export const activityReducer = activitySlice.reducer;
export default activityReducer;
