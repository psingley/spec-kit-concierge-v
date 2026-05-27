import { runAfterHook } from './hookHelpers';
import type { StepHook } from './types';
export const afterSpecifyHook: StepHook = (context) => runAfterHook('specify', context);
