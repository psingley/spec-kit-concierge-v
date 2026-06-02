import { createMainLogger } from '../logging';
import { commitWithTrailer as defaultCommitWithTrailer, runGit } from '../data-layer/git/gitCommand';
import { writeFailedStepMarker as defaultWriteFailedStepMarker } from '../data-layer/failedSteps';
import { createStepOwnedArtifactSnapshot } from '../domain/factories/artifactSnapshot.factory';
import type { Anomaly, BranchStateSnapshot, ReconciliationResult, StepOwnedArtifactSnapshot } from '../domain/manifest/types';
import {
  validateAnalyzeArtifacts,
  validateClarifyArtifacts,
  validatePlanArtifacts,
  validateReviewArtifacts,
  validateSpecifyArtifacts,
  validateTasksArtifacts
} from '../domain/factories';
import { writeInFlightMarker as defaultWriteInFlightMarker, removeInFlightMarker as defaultRemoveInFlightMarker } from './inFlightMarker';
import { STEP_ARTIFACT_MANIFEST, expectedArtifactsForStep, ownedArtifactsForStep, type StepName } from './manifest';
import { checkStepPrerequisites } from './prerequisiteGate';
import { lifecycleEvent, type StepHookContext, type StepHookResult, type StepStartSnapshot } from './types';
import path from 'node:path';

const validators = {
  specify: validateSpecifyArtifacts,
  clarify: validateClarifyArtifacts,
  plan: validatePlanArtifacts,
  tasks: validateTasksArtifacts,
  analyze: validateAnalyzeArtifacts,
  review: validateReviewArtifacts
} as const;

const parseTrackedChanges = (statusPorcelain: string): string[] =>
  statusPorcelain
    .split(/\r?\n/)
    .map((line) => line.replace(/^(?:..|.)\s+/, '').trim())
    .filter(Boolean)
    .map((changedPath) => (changedPath.includes(' -> ') ? changedPath.split(' -> ').at(-1) ?? changedPath : changedPath));

const captureBranchState = async (context: StepHookContext): Promise<BranchStateSnapshot> => {
  const [branch, headSha, statusPorcelain] = await Promise.all([
    runGit(context.repositoryPath, ['rev-parse', '--abbrev-ref', 'HEAD']),
    runGit(context.repositoryPath, ['rev-parse', 'HEAD']),
    runGit(context.repositoryPath, ['status', '--porcelain'])
  ]);

  return {
    branch,
    headSha,
    statusPorcelain,
    trackedChanges: parseTrackedChanges(statusPorcelain),
    timestamp: (context.now?.() ?? new Date()).toISOString()
  };
};

const captureOwnedPathSnapshot = async (
  step: StepName,
  context: StepHookContext
): Promise<StepOwnedArtifactSnapshot> => {
  const snapshot = await createStepOwnedArtifactSnapshot({
    step,
    featureDir: context.featureDir,
    capturedAt: (context.now?.() ?? new Date()).toISOString(),
    ownedArtifacts: ownedArtifactsForStep(step, context.contextFilePath),
    allowMissingRequired: true
  });

  if (!snapshot.ok) {
    throw new Error(`${snapshot.error.name}: ${snapshot.error.message} at ${snapshot.error.path}`);
  }

  return snapshot.value;
};

const captureStepStartSnapshot = async (
  step: StepName,
  context: StepHookContext
): Promise<StepStartSnapshot | undefined> => {
  if (
    context.captureBranchState === undefined &&
    context.captureOwnedPathSnapshot === undefined &&
    context.stepStartSnapshotSink === undefined
  ) {
    return undefined;
  }

  const branchBefore = await (context.captureBranchState ?? captureBranchState)(context);
  const ownedPathSnapshot = await (context.captureOwnedPathSnapshot ?? captureOwnedPathSnapshot)(step, context, branchBefore);
  const snapshot = { step, branchBefore, ownedPathSnapshot };
  await context.stepStartSnapshotSink?.(snapshot);

  return snapshot;
};

const createFeatureArtifactDeltaReader = (context: StepHookContext) => async (
  files: readonly string[]
): Promise<boolean> => {
  if (files.length === 0) {
    return false;
  }

  const featurePrefix = path.relative(context.repositoryPath, context.featureDir);
  const repositoryFiles = files.map((file) =>
    path.isAbsolute(file)
      ? path.relative(context.repositoryPath, file)
      : path.join(featurePrefix, file)
  );

  const status = await runGit(context.repositoryPath, ['status', '--porcelain', '--', ...repositoryFiles]);
  return status.length > 0;
};

const strandedArtifactsFromAnomalies = (anomalies: Anomaly[]): string[] =>
  anomalies.flatMap((anomaly) => {
    const strandedArtifacts = anomaly.evidence.strandedArtifacts;
    return Array.isArray(strandedArtifacts)
      ? strandedArtifacts.filter((artifact): artifact is string => typeof artifact === 'string')
      : [];
  });

const persistReconciliationFailure = async (
  step: StepName,
  context: StepHookContext,
  reconciliation: ReconciliationResult,
  reason: string
): Promise<void> => {
  const writeMarker = context.writeFailedStepMarker ?? defaultWriteFailedStepMarker;
  await writeMarker({
    repositoryPath: context.repositoryPath,
    userDataPath: context.userDataPath,
    step,
    sessionId: context.sessionId,
    failedAt: (context.now?.() ?? new Date()).toISOString(),
    reason,
    strandedArtifacts: strandedArtifactsFromAnomalies(reconciliation.anomalies),
    anomalyIds: reconciliation.requiredInterventions
  });
};

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

    const stepStartSnapshot = await captureStepStartSnapshot(step, context);

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

    return { ok: true, phase: 'before', step, lifecycleAction: 'pending', event: pending, ...(stepStartSnapshot === undefined ? {} : { stepStartSnapshot }) };
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
      : step === 'clarify' && context.validateArtifacts === undefined && context.hasArtifactDelta === undefined
        ? {
          ...context,
          hasArtifactDelta: createFeatureArtifactDeltaReader(context)
        }
        : context;
    const result = await validate(context.featureDir, validationContext);
    if (!result.ok) {
      const reason = result.kind === 'malformed-questions' ? 'clarify-malformed' : result.escapeHatchReason;
      logger.error(
        lifecycleEvent('step-escape-hatch-triggered', step, context, { reason }),
        'step after hook factory failed'
      );
      return {
        ok: false,
        phase: 'after',
        step,
        escapeHatchReason: reason,
        ...(result.kind !== 'malformed-questions' && result.failureReason !== undefined
          ? { failureReason: result.failureReason }
          : {}),
        ...(result.kind !== 'malformed-questions' && result.strandedArtifacts !== undefined
          ? { strandedArtifacts: result.strandedArtifacts }
          : {})
      };
    }

    const commitWriter = context.commitWithTrailer ?? defaultCommitWithTrailer;
    const preCommitReconciliation = await context.reconcileAfterHook?.('pre-commit', {
      step,
      context,
      commitCandidate: result.commit
    });
    if (
      preCommitReconciliation !== undefined &&
      preCommitReconciliation.status !== 'pass' &&
      !preCommitReconciliation.canCommit
    ) {
      await persistReconciliationFailure(step, context, preCommitReconciliation, 'pre-commit reconciliation blocked completion');
      return {
        ok: false,
        phase: 'after',
        step,
        escapeHatchReason: 'factory-rejected',
        failureReason: 'pre-commit reconciliation blocked completion'
      };
    }

    const commit = await commitWriter(context.repositoryPath, result.commit);
    const postCommitReconciliation = await context.reconcileAfterHook?.('post-commit', {
      step,
      context,
      commitCandidate: result.commit,
      commitResult: commit
    });
    if (
      postCommitReconciliation !== undefined &&
      postCommitReconciliation.status !== 'pass'
    ) {
      await persistReconciliationFailure(step, context, postCommitReconciliation, 'post-commit reconciliation did not verify completion');
      return {
        ok: false,
        phase: 'after',
        step,
        escapeHatchReason: 'factory-rejected',
        failureReason: 'post-commit reconciliation did not verify completion'
      };
    }

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
