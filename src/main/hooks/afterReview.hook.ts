import { runAfterHook } from './hookHelpers';
import type { StepHook } from './types';
export const afterReviewHook: StepHook = (context) => runAfterHook('review', context);
