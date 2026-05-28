import type { RootState } from '../store';

export const selectPreferencesState = (state: RootState) => state.preferences;
export const selectPreferencesHydratedFromDisk = (state: RootState) => state.preferences.hydratedFromDisk;
export const selectPreferencesTheme = (state: RootState) => state.preferences.theme;
export const selectPreferencesAccent = (state: RootState) => state.preferences.accent;
export const selectPreferencesDensity = (state: RootState) => state.preferences.density;
export const selectPreferencesActivitySide = (state: RootState) => state.preferences.activitySide;
export const selectPreferencesRequireScrollToUnlock = (state: RootState) =>
  state.preferences.requireScrollToUnlock;
export const selectPreferencesRecentRepositories = (state: RootState) => state.preferences.recentRepositories;
export const selectPreferencesSelectedCopilotModel = (state: RootState) =>
  state.preferences.selectedCopilotModel;
export const selectPreferencesPersistenceStatus = (state: RootState) => state.preferences.persistenceStatus;
export const selectPreferencesLastPersistenceError = (state: RootState) =>
  state.preferences.lastPersistenceError;
