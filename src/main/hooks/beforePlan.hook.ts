import { runBeforeHook } from './hookHelpers';
import type { StepHook } from './types';
export const beforePlanHook: StepHook = (context) => runBeforeHook('plan', context);
