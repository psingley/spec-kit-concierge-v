import type { RootState } from '../store';

export const selectPreferencesState = (state: RootState) => state.preferences;
export const selectPreferencesHydratedFromDisk = (state: RootState) => state.preferences.hydratedFromDisk;
export const selectPreferencesTheme = (state: RootState) => state.preferences.theme;
