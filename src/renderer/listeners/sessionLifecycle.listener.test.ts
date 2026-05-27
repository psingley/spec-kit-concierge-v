import { describe, expect, it, vi } from 'vitest';
import { sessionLifecycleTopic, setupSessionLifecycleListener } from './sessionLifecycle.listener';
import type { AppStartListening } from './types';

describe('session lifecycle listener', () => {
  it('exports the reserved topic descriptor', () => {
    expect(sessionLifecycleTopic.topic).toBe('sessionLifecycle');
  });

  it('accepts startListening without registering Run 4 effects', () => {
    const startListening = vi.fn() as unknown as AppStartListening;

    setupSessionLifecycleListener(startListening);

    expect(startListening).not.toHaveBeenCalled();
  });
});
