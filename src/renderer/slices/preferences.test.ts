import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import {
  selectPreferencesHydratedFromDisk,
  selectPreferencesState,
  selectPreferencesTheme
} from './preferences.selectors';
import preferencesReducer from './preferences';

describe('preferences slice', () => {
  it('initializes to the Run 4 locked state', () => {
    expect(preferencesReducer(undefined, { type: 'test/init' })).toEqual({
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
    });
  });

  it('exposes base selectors through RootState', () => {
    const state = createProductStore().getState();

    expect(selectPreferencesState(state)).toBe(state.preferences);
    expect(selectPreferencesHydratedFromDisk(state)).toBe(false);
    expect(selectPreferencesTheme(state)).toBe('system');
  });
});
