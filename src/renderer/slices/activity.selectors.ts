import type { RootState } from '../store';

export const selectActivityState = (state: RootState) => state.activity;
export const selectActivityEntries = (state: RootState) => state.activity.entries;
export const selectActivityCap = (state: RootState) => state.activity.cap;
