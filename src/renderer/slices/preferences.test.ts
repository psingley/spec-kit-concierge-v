import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import {
  selectPreferencesHydratedFromDisk,
  selectPreferencesSelectedCopilotModel,
  selectPreferencesState,
  selectPreferencesTheme
} from './preferences.selectors';
import preferencesReducer, { DEFAULT_COPILOT_MODEL_ID } from './preferences';

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

  it('keeps an absent saved model preference distinct from the renderer default model id', () => {
    const state = createProductStore().getState();

    expect(DEFAULT_COPILOT_MODEL_ID).toBe('gpt-5.4-mini');
    expect(selectPreferencesSelectedCopilotModel(state)).toBeNull();
  });
});
