import type { StepHook } from './types';
import { lifecycleEvent } from './types';

export const afterReviewHook: StepHook = async (context) => {
  const event = lifecycleEvent('step-complete', 'review', context);
  await context.activitySink?.(event);

  return {
    ok: true,
    phase: 'after',
    step: 'review',
    lifecycleAction: 'complete',
    event
  };
};
