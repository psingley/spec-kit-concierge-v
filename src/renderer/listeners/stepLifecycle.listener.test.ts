import { describe, expect, it, vi } from 'vitest';
import { setupStepLifecycleListener, stepLifecycleTopic } from './stepLifecycle.listener';
import type { AppStartListening } from './types';

describe('step lifecycle listener', () => {
  it('exports the reserved topic descriptor', () => {
    expect(stepLifecycleTopic.topic).toBe('stepLifecycle');
  });

  it('accepts startListening without registering Run 4 effects', () => {
    const startListening = vi.fn() as unknown as AppStartListening;

    setupStepLifecycleListener(startListening);

    expect(startListening).not.toHaveBeenCalled();
  });
});
