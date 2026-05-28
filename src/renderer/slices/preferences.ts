import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type PreferencesState = {
  hydratedFromDisk: boolean;
  theme: 'system' | 'light' | 'dark';
  accent: string;
  density: 'compact' | 'comfortable';
  activitySide: 'left' | 'right' | 'hidden';
  requireScrollToUnlock: boolean;
  recentRepositories: string[];
  selectedCopilotModel: string | null;
  persistenceStatus: 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
  lastPersistenceError: string | null;
};

export const preferencesInitialState: PreferencesState = {
  hydratedFromDisk: false,
  theme: 'system',
  accent: '#8b5cf6',
  density: 'comfortable',
  activitySide: 'right',
  requireScrollToUnlock: true,
  recentRepositories: [],
  selectedCopilotModel: null,
  persistenceStatus: 'idle',
  lastPersistenceError: null
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: preferencesInitialState,
  reducers: {
    preferencesHydrated: (state, action: PayloadAction<Partial<PreferencesState>>) => {
      Object.assign(state, action.payload, { hydratedFromDisk: true, persistenceStatus: 'saved' as const });
    },
    preferencesUpdated: (
      state,
      action: PayloadAction<Partial<Pick<PreferencesState, 'accent' | 'density' | 'activitySide' | 'requireScrollToUnlock' | 'selectedCopilotModel' | 'theme'>>>
    ) => {
      Object.assign(state, action.payload);
      state.persistenceStatus = 'dirty';
      state.lastPersistenceError = null;
    },
    recentRepositoryRecorded: (state, action: PayloadAction<string>) => {
      state.recentRepositories = [action.payload, ...state.recentRepositories.filter((repo) => repo !== action.payload)].slice(0, 8);
      state.persistenceStatus = 'dirty';
    },
    preferencesPersistStarted: (state) => {
      state.persistenceStatus = 'saving';
    },
    preferencesPersistSucceeded: (state) => {
      state.persistenceStatus = 'saved';
      state.lastPersistenceError = null;
    },
    preferencesPersistFailed: (state, action: PayloadAction<string>) => {
      state.persistenceStatus = 'error';
      state.lastPersistenceError = action.payload;
    }
  },
  extraReducers: () => {}
});

export const {
  preferencesHydrated,
  preferencesUpdated,
  recentRepositoryRecorded,
  preferencesPersistStarted,
  preferencesPersistSucceeded,
  preferencesPersistFailed
} = preferencesSlice.actions;
export const preferencesReducer = preferencesSlice.reducer;
export default preferencesReducer;
