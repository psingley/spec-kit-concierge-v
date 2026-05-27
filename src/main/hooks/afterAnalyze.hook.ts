import { runAfterHook } from './hookHelpers';
import type { StepHook } from './types';
export const afterAnalyzeHook: StepHook = (context) => runAfterHook('analyze', context);
