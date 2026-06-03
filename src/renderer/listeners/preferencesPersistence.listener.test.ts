import { describe, expect, it, vi } from 'vitest';
import {
  preferencesPersistenceTopic,
  setupPreferencesPersistenceListener
} from './preferencesPersistence.listener';
import type { AppStartListening } from './types';

const mocks = vi.hoisted(() => ({
  writePreferencesInitiate: vi.fn((payload: unknown) => ({ type: 'writePreferences/initiate', payload }))
}));

vi.mock('../api', () => ({
  api: {
    endpoints: {
      writePreferences: {
        initiate: mocks.writePreferencesInitiate
      }
    }
  }
}));

const basePreferences = {
  theme: 'system' as const,
  accent: '#8b5cf6',
  density: 'comfortable' as const,
  activitySide: 'right' as const,
  requireScrollToUnlock: true,
  recentRepositories: [],
  selectedCopilotModel: null
};

const capturePersistenceEffect = () => {
  const startListening = vi.fn() as unknown as AppStartListening;
  setupPreferencesPersistenceListener(startListening);
  const registration = vi.mocked(startListening).mock.calls[0]?.[0];
  if (registration === undefined || !('effect' in registration)) {
    throw new Error('listener effect was not registered');
  }
  return registration.effect;
};

describe('preferences persistence listener', () => {
  it('exports the reserved topic descriptor', () => {
    expect(preferencesPersistenceTopic.topic).toBe('preferencesPersistence');
  });

  it('registers the Run 6 debounced persistence effect', () => {
    const startListening = vi.fn() as unknown as AppStartListening;

    setupPreferencesPersistenceListener(startListening);

    expect(startListening).toHaveBeenCalledTimes(1);
  });

  it('persists activity preference changes without dropping the saved model preference', async () => {
    const effect = capturePersistenceEffect();
    const dispatch = vi.fn(async () => ({ data: { hydratedFromDisk: true, theme: 'system' } }));

    await effect({ type: 'preferences/preferencesUpdated', payload: { activitySide: 'hidden' } }, {
      cancelActiveListeners: vi.fn(),
      delay: vi.fn(async () => undefined),
      dispatch,
      getState: () => ({
        preferences: {
          ...basePreferences,
          activitySide: 'hidden',
          selectedCopilotModel: 'claude-sonnet-4-5'
        }
      })
    } as never);

    expect(mocks.writePreferencesInitiate).toHaveBeenCalledWith(expect.objectContaining({
      activitySide: 'hidden',
      selectedCopilotModel: 'claude-sonnet-4-5'
    }));
  });

  it('persists model preference changes without dropping the saved activity preference', async () => {
    const effect = capturePersistenceEffect();
    const dispatch = vi.fn(async () => ({ data: { hydratedFromDisk: true, theme: 'system' } }));

    await effect({ type: 'preferences/preferencesUpdated', payload: { selectedCopilotModel: 'gpt-5.4-mini' } }, {
      cancelActiveListeners: vi.fn(),
      delay: vi.fn(async () => undefined),
      dispatch,
      getState: () => ({
        preferences: {
          ...basePreferences,
          activitySide: 'left',
          selectedCopilotModel: 'gpt-5.4-mini'
        }
      })
    } as never);

    expect(mocks.writePreferencesInitiate).toHaveBeenCalledWith(expect.objectContaining({
      activitySide: 'left',
      selectedCopilotModel: 'gpt-5.4-mini'
    }));
  });
});
