import { runAfterHook } from './hookHelpers';
import type { StepHook } from './types';
export const afterPlanHook: StepHook = (context) => runAfterHook('plan', context);
