import { runBeforeHook } from './hookHelpers';
import type { StepHook } from './types';
export const beforeAnalyzeHook: StepHook = (context) => runBeforeHook('analyze', context);
