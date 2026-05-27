import { runBeforeHook } from './hookHelpers';
import type { StepHook } from './types';
export const beforeTasksHook: StepHook = (context) => runBeforeHook('tasks', context);
