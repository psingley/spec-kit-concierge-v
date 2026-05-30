import { createMainLogger } from '../logging';
import { commitWithTrailer as defaultCommitWithTrailer, runGit } from '../data-layer/git/gitCommand';
import {
  validateAnalyzeArtifacts,
  validateClarifyArtifacts,
  validatePlanArtifacts,
  validateReviewArtifacts,
  validateSpecifyArtifacts,
  validateTasksArtifacts
} from '../domain/factories';
import { writeInFlightMarker as defaultWriteInFlightMarker, removeInFlightMarker as defaultRemoveInFlightMarker } from './inFlightMarker';
import { STEP_ARTIFACT_MANIFEST, expectedArtifactsForStep, type StepName } from './manifest';
import { checkStepPrerequisites } from './prerequisiteGate';
import { lifecycleEvent, type StepHookContext, type StepHookResult } from './types';
import path from 'node:path';

const validators = {
  specify: validateSpecifyArtifacts,
  clarify: validateClarifyArtifacts,
  plan: validatePlanArtifacts,
  tasks: validateTasksArtifacts,
  analyze: validateAnalyzeArtifacts,
  review: validateReviewArtifacts
} as const;

export const runBeforeHook = async (
  step: StepName,
  context: StepHookContext
): Promise<StepHookResult> => {
  const logger = createMainLogger({ userDataPath: context.userDataPath, now: context.now });
  const startedAt = Date.now();
  const start = lifecycleEvent('step-before-hook-start', step, context);
  logger.info(start, 'step before hook start');

  try {
    const gate = await checkStepPrerequisites(step, context);
    if (!gate.ok) {
      logger.error(
        lifecycleEvent('step-escape-hatch-triggered', step, context, { reason: gate.escapeHatchReason }),
        'step before hook failed'
      );
      return { ok: false, phase: 'before', step, escapeHatchReason: gate.escapeHatchReason };
    }

    const writeMarker = context.writeInFlightMarker ?? ((sessionId, markerStep) =>
      defaultWriteInFlightMarker({
        userDataPath: context.userDataPath,
        sessionId,
        step: markerStep,
        expectedArtifacts: expectedArtifactsForStep(markerStep, context.contextFilePath),
        startedAt: (context.now?.() ?? new Date()).toISOString()
      }));
    await writeMarker(context.sessionId, step);

    const pending = lifecycleEvent('step-pending', step, context);
    logger.info(pending, 'step pending');
    await context.activitySink?.(pending);
    logger.info(
      lifecycleEvent('step-before-hook-end', step, context, { latencyMs: Date.now() - startedAt }),
      'step before hook end'
    );

    return { ok: true, phase: 'before', step, lifecycleAction: 'pending', event: pending };
  } catch (error) {
    logger.error({ ...lifecycleEvent('step-before-hook-end', step, context), error }, 'step before hook error');
    return { ok: false, phase: 'before', step, escapeHatchReason: 'hook-failed', error };
  }
};

export const runAfterHook = async (
  step: StepName,
  context: StepHookContext
): Promise<StepHookResult> => {
  if (step === 'review') {
    const complete = lifecycleEvent('step-complete', step, context);
    await context.activitySink?.(complete);
    return { ok: true, phase: 'after', step, lifecycleAction: 'complete', event: complete };
  }

  const logger = createMainLogger({ userDataPath: context.userDataPath, now: context.now });
  const startedAt = Date.now();
  logger.info(lifecycleEvent('step-after-hook-start', step, context), 'step after hook start');

  try {
    const validate = context.validateArtifacts ?? validators[step];
    const validationContext = step === 'analyze' && context.validateArtifacts === undefined
      ? {
        ...context,
        remediationFiles: await runGit(context.repositoryPath, [
          'diff',
          '--name-only',
          'HEAD',
          '--',
          path.relative(context.repositoryPath, context.featureDir) || '.'
        ]).then((output) => output.split(/\r?\n/).filter(Boolean))
      }
      : context;
    const result = await validate(context.featureDir, validationContext);
    if (!result.ok) {
      const reason = result.kind === 'malformed-questions' ? 'clarify-malformed' : result.escapeHatchReason;
      logger.error(
        lifecycleEvent('step-escape-hatch-triggered', step, context, { reason }),
        'step after hook factory failed'
      );
      return { ok: false, phase: 'after', step, escapeHatchReason: reason };
    }

    const commitWriter = context.commitWithTrailer ?? defaultCommitWithTrailer;
    const commit = await commitWriter(context.repositoryPath, result.commit);
    const trailer = `Concierge-Step: ${result.commit.step}:${result.commit.status}`;
    const commitEvent = lifecycleEvent('step-commit-written', step, context, { trailer });
    logger.info(commitEvent, 'step commit written');
    await context.activitySink?.(commitEvent);

    const removeMarker = context.removeInFlightMarker ?? ((sessionId, markerStep) =>
      defaultRemoveInFlightMarker({ userDataPath: context.userDataPath, sessionId, step: markerStep }));
    await removeMarker(context.sessionId, step);

    const complete = lifecycleEvent('step-complete', step, context, { trailer });
    logger.info(complete, 'step complete');
    await context.activitySink?.(complete);
    logger.info(
      lifecycleEvent('step-after-hook-end', step, context, { latencyMs: Date.now() - startedAt }),
      'step after hook end'
    );

    return {
      ok: true,
      phase: 'after',
      step,
      lifecycleAction: 'complete',
      commit: { ...result.commit, commitSha: commit.commitSha },
      event: complete
    };
  } catch (error) {
    logger.error({ ...lifecycleEvent('step-after-hook-end', step, context), error }, 'step after hook error');
    return { ok: false, phase: 'after', step, escapeHatchReason: 'hook-failed', error };
  }
};

export const manifestForHook = (step: StepName) => STEP_ARTIFACT_MANIFEST[step];
