import { createMainLogger } from '../logging';
import { afterAnalyzeHook } from './afterAnalyze.hook';
import { afterClarifyHook } from './afterClarify.hook';
import { afterPlanHook } from './afterPlan.hook';
import { afterReviewHook } from './afterReview.hook';
import { afterSpecifyHook } from './afterSpecify.hook';
import { afterTasksHook } from './afterTasks.hook';
import { beforeAnalyzeHook } from './beforeAnalyze.hook';
import { beforeClarifyHook } from './beforeClarify.hook';
import { beforePlanHook } from './beforePlan.hook';
import { beforeReviewHook } from './beforeReview.hook';
import { beforeSpecifyHook } from './beforeSpecify.hook';
import { beforeTasksHook } from './beforeTasks.hook';
import { isStepName, type StepName } from './manifest';
import { lifecycleEvent, type StepHook, type StepHookContext, type StepHookResult } from './types';

const routes: Record<string, StepHook> = {
  before_specify: beforeSpecifyHook,
  after_specify: afterSpecifyHook,
  before_clarify: beforeClarifyHook,
  after_clarify: afterClarifyHook,
  before_plan: beforePlanHook,
  after_plan: afterPlanHook,
  before_tasks: beforeTasksHook,
  after_tasks: afterTasksHook,
  before_analyze: beforeAnalyzeHook,
  after_analyze: afterAnalyzeHook,
  before_review: beforeReviewHook,
  after_review: afterReviewHook
};

const parseHookName = (hookName: string): { phase: 'before' | 'after'; step: StepName } | undefined => {
  const match = /^(before|after)_([a-z]+)$/.exec(hookName);
  if (match === null) {
    return undefined;
  }
  const phase = match[1];
  const step = match[2];
  if ((phase !== 'before' && phase !== 'after') || step === undefined || !isStepName(step)) {
    return undefined;
  }

  return { phase, step };
};

export type DispatchStepHookRequest = StepHookContext & {
  hookName: string;
};

export const dispatchStepHook = async (request: DispatchStepHookRequest): Promise<StepHookResult> => {
  const route = routes[request.hookName];
  const parsed = parseHookName(request.hookName);
  const logger = createMainLogger({ userDataPath: request.userDataPath, now: request.now });

  if (route === undefined || parsed === undefined) {
    logger.error({ hookName: request.hookName }, 'unknown step lifecycle hook');
    return {
      ok: false,
      phase: 'before',
      step: 'specify',
      escapeHatchReason: 'hook-failed'
    };
  }

  logger.info(lifecycleEvent(`step-${parsed.phase}-hook-start`, parsed.step, request), 'dispatcher hook start');
  const result = await route({ ...request, hookName: request.hookName });
  logger.info(lifecycleEvent(`step-${parsed.phase}-hook-end`, parsed.step, request), 'dispatcher hook end');

  return result;
};
