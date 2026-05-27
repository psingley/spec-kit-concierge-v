import { runBeforeHook } from './hookHelpers';
import type { StepHook } from './types';
export const beforeReviewHook: StepHook = (context) => runBeforeHook('review', context);
