import { describe, expect, it, vi } from 'vitest';
import {
  preferencesPersistenceTopic,
  setupPreferencesPersistenceListener
} from './preferencesPersistence.listener';
import type { AppStartListening } from './types';

describe('preferences persistence listener', () => {
  it('exports the reserved topic descriptor', () => {
    expect(preferencesPersistenceTopic.topic).toBe('preferencesPersistence');
  });

  it('registers the Run 6 debounced persistence effect', () => {
    const startListening = vi.fn() as unknown as AppStartListening;

    setupPreferencesPersistenceListener(startListening);

    expect(startListening).toHaveBeenCalledTimes(1);
  });
});
