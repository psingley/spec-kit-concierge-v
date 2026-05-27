import { runBeforeHook } from './hookHelpers';
import type { StepHook } from './types';
export const beforeClarifyHook: StepHook = (context) => runBeforeHook('clarify', context);
