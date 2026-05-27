import { runAfterHook } from './hookHelpers';
import type { StepHook } from './types';
export const afterTasksHook: StepHook = (context) => runAfterHook('tasks', context);
