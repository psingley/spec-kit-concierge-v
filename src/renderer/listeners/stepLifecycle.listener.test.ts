import { describe, expect, it, vi } from 'vitest';
import { setupStepLifecycleListener, stepLifecycleTopic } from './stepLifecycle.listener';
import {
  clarifyQuestionMalformed,
  dirtyResumeDetected,
  hookFailed,
  stepsRestorationRequested
} from '../slices/steps';
import type { AppStartListening } from './types';

describe('step lifecycle listener', () => {
  it('exports the reserved topic descriptor', () => {
    expect(stepLifecycleTopic.topic).toBe('stepLifecycle');
  });

  it('registers Run 5 step lifecycle effects', () => {
    const startListening = vi.fn() as unknown as AppStartListening;

    setupStepLifecycleListener(startListening);

    expect(startListening).toHaveBeenCalledTimes(4);
    expect(startListening).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ actionCreator: stepsRestorationRequested, effect: expect.any(Function) })
    );
    expect(startListening).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ actionCreator: dirtyResumeDetected, effect: expect.any(Function) })
    );
    expect(startListening).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ actionCreator: hookFailed, effect: expect.any(Function) })
    );
    expect(startListening).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ actionCreator: clarifyQuestionMalformed, effect: expect.any(Function) })
    );
  });
});
