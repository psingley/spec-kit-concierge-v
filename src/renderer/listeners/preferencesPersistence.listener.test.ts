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

  it('accepts startListening without registering Run 4 effects', () => {
    const startListening = vi.fn() as unknown as AppStartListening;

    setupPreferencesPersistenceListener(startListening);

    expect(startListening).not.toHaveBeenCalled();
  });
});
