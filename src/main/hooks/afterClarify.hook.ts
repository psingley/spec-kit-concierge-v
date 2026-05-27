import { runAfterHook } from './hookHelpers';
import type { StepHook } from './types';
export const afterClarifyHook: StepHook = (context) => runAfterHook('clarify', context);
