import { runBeforeHook } from './hookHelpers';
import type { StepHook } from './types';
export const beforeSpecifyHook: StepHook = (context) => runBeforeHook('specify', context);
