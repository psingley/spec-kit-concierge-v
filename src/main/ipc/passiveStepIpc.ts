import type { IpcMain } from 'electron';
import { STEP_ARTIFACT_MANIFEST, expectedArtifactsForStep, type StepName } from '../hooks/manifest';
import { captureAnalyzeReport } from '../domain/evidence/analyzeReport';
import { discoverOptionalArtifacts } from '../domain/factories/factoryUtils';
import type { BoundCLIPromptUpdate } from '../data-layer/acp/types';
import { readFailedStepMarker, removeFailedStepMarker, writeFailedStepMarker } from '../data-layer/failedSteps';
import { resolveFeatureDir } from '../data-layer/specify/featureDir';
import type { DirtyDiffGateResult } from '../domain/reconciliation/dirtyDiffGates';
import type { StepHookContext, StepHookResult } from '../hooks/types';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, toError } from './handlerUtils';
import { createStepStreamEvent, type PassiveStepSummary, type StepStreamEvent } from './stepStreamEvent.factory';

export type PassiveStepName = Extract<StepName, 'plan' | 'tasks' | 'analyze'>;

export type PassiveStepRequest = {
  subscriptionId: string;
  repositoryPath: string;
  branch: string;
  modelId?: string;
};

export type PassiveStepAck = {
  subscriptionId: string;
  sessionId: string;
  step: PassiveStepName;
  accepted: true;
};

export type PassiveStepAgentResult = {
  updates?: readonly BoundCLIPromptUpdate[];
};

export type PassiveStepAgentAdapter = (
  request: PassiveStepRequest & {
    step: PassiveStepName;
    sessionId: string;
    featureDir: string;
    signal: AbortSignal;
    onUpdate?: (update: BoundCLIPromptUpdate) => void;
  }
) => Promise<PassiveStepAgentResult | void>;

export type RegisterPassiveStepIpcOptions = {
  step: PassiveStepName;
  channel: string;
  eventChannel: string;
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath: string;
  beforeHook: (context: StepHookContext) => Promise<StepHookResult>;
  afterHook: (context: StepHookContext) => Promise<StepHookResult>;
  agentAdapter: PassiveStepAgentAdapter;
  dirtyDiffGate?: (context: StepHookContext) => Promise<DirtyDiffGateResult | undefined>;
  abortSignal?: AbortSignal;
  now?: () => number;
};

const parseRequest = (channel: string, args: unknown[]): PassiveStepRequest => {
  const value = assertOnePayload(channel, args);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw toError(`${channel} payload must be an object.`);
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!['subscriptionId', 'repositoryPath', 'branch', 'modelId'].includes(key)) {
      throw toError(`${channel} payload contains an unexpected key.`);
    }
  }
  if (typeof record.subscriptionId !== 'string' || typeof record.repositoryPath !== 'string' || typeof record.branch !== 'string') {
    throw toError(`${channel} payload is missing required strings.`);
  }
  return {
    subscriptionId: record.subscriptionId,
    repositoryPath: record.repositoryPath,
    branch: record.branch,
    modelId: typeof record.modelId === 'string' ? record.modelId : undefined
  };
};

const kindForArtifact = (artifactPath: string): PassiveStepSummary['artifacts'][number]['kind'] => {
  if (artifactPath.endsWith('.md')) return 'markdown';
  if (/\.(ts|tsx|js|jsx|json|yml|yaml)$/i.test(artifactPath)) return 'code';
  if (/\.(png|jpg|jpeg|gif|webp)$/i.test(artifactPath)) return 'image';
  if (artifactPath.endsWith('.pdf')) return 'pdf';
  return 'text';
};

const requiredArtifactsForStep = (step: PassiveStepName): string[] => {
  if (step === 'plan') {
    return [...STEP_ARTIFACT_MANIFEST.plan.requiredFiles];
  }
  return expectedArtifactsForStep(step);
};

const summaryForStep = async (step: PassiveStepName, featureDir: string): Promise<PassiveStepSummary> => {
  const requiredArtifacts = requiredArtifactsForStep(step).map((artifactPath) => ({
    path: artifactPath,
    kind: kindForArtifact(artifactPath),
    required: step !== 'analyze'
  }));
  const optionalArtifacts = step === 'plan'
    ? (await discoverOptionalArtifacts(featureDir, 'plan')).map((artifactPath) => ({
      path: artifactPath,
      kind: kindForArtifact(artifactPath),
      required: false
    }))
    : [];
  const artifacts = [...requiredArtifacts, ...optionalArtifacts];
  return {
    artifacts,
    counts: {
      required: artifacts.filter((artifact) => artifact.required).length,
      optional: artifacts.filter((artifact) => !artifact.required).length,
      present: artifacts.length
    },
    milestones: [
      { id: `${step}-lifecycle`, label: 'Lifecycle hooks completed', status: 'complete' },
      { id: `${step}-artifacts`, label: 'Artifact manifest validated', status: 'complete' }
    ]
  };
};

export const registerPassiveStepIpc = ({
  step,
  channel,
  eventChannel,
  ipcMain,
  logger,
  userDataPath,
  beforeHook,
  afterHook,
  agentAdapter,
  dirtyDiffGate,
  abortSignal,
  now = () => performance.now()
}: RegisterPassiveStepIpcOptions): void => {
  ipcMain.handle(channel, async (event, ...args: unknown[]): Promise<PassiveStepAck> => {
    const startedAt = now();
    const context = getSenderContext(event);
    const request = parseRequest(channel, args);
    const sessionId = `${step}-${Date.now().toString(36)}`;
    const ack: PassiveStepAck = { subscriptionId: request.subscriptionId, sessionId, step, accepted: true };
    const controller = new AbortController();

    if (abortSignal !== undefined) {
      if (abortSignal.aborted) {
        controller.abort();
      } else {
        abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    const sendEvent = (streamEvent: StepStreamEvent): void => {
      const parsed = createStepStreamEvent(streamEvent);
      if (!parsed.ok) {
        logger.error({ channel, context, success: false, error: parsed.error }, 'ipc handler invocation');
        return;
      }
      event.sender.send(eventChannel, { subscriptionId: request.subscriptionId, event: parsed.value });
    };

    const run = async (): Promise<void> => {
      let terminalSent = false;
      let featureDir: string | undefined;
      let failureDetails: { reason?: string; strandedArtifacts?: string[]; anomalyIds?: string[] } = {};
      const terminal = (streamEvent: Extract<StepStreamEvent, { type: 'done' }>): void => {
        if (terminalSent) {
          return;
        }
        terminalSent = true;
        sendEvent(streamEvent);
      };
      const failureReasonFor = (result: Extract<StepHookResult, { ok: false }>): string =>
        result.failureReason ?? result.escapeHatchReason;
      const finishPass = async (
        commitSha: string,
        activeFeatureDir: string,
        agentResult?: PassiveStepAgentResult | void
      ): Promise<void> => {
        if (step === 'analyze') {
          await captureAnalyzeReport({
            userDataPath,
            featureDir: activeFeatureDir,
            sessionId,
            analyzeCommitSha: commitSha,
            updates: agentResult?.updates ?? []
          });
        }
        await removeFailedStepMarker({ repositoryPath: request.repositoryPath, step });
        terminal({ type: 'done', step, sessionId, status: 'pass', commitSha, summary: await summaryForStep(step, activeFeatureDir) });
        logger.info({ channel, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      };
      try {
        if (controller.signal.aborted) {
          throw new Error('aborted');
        }
        featureDir = await resolveFeatureDir(request.repositoryPath);
        const hookContext = {
          repositoryPath: request.repositoryPath,
          featureDir,
          sessionId,
          userDataPath,
          authStatus: { githubLoggedIn: true, copilotLoggedIn: true }
        };
        const before = await beforeHook(hookContext);
        if (!before.ok) {
          failureDetails = { reason: failureReasonFor(before), strandedArtifacts: before.strandedArtifacts };
          throw new Error(failureReasonFor(before));
        }
        sendEvent({ type: 'progress', step, sessionId, level: 'info', message: `Running ${step}`, timestamp: new Date().toISOString() });

        const existingFailure = step === 'tasks'
          ? await readFailedStepMarker({ repositoryPath: request.repositoryPath, step })
          : undefined;
        if (existingFailure !== undefined) {
          const retryAfter = await afterHook(hookContext);
          if (retryAfter.ok && retryAfter.commit?.commitSha !== undefined) {
            await finishPass(retryAfter.commit.commitSha, featureDir);
            return;
          }
        }

        const agentResult = await agentAdapter({
          ...request,
          step,
          sessionId,
          featureDir,
          signal: controller.signal,
          onUpdate: (update) => {
            sendEvent({
              type: 'progress',
              step,
              sessionId,
              level: 'info',
              message: `Streaming ${step} output`,
              timestamp: new Date().toISOString(),
              raw: update
            });
          }
        });
        const dirtyDiff = await dirtyDiffGate?.(hookContext);
        if (dirtyDiff?.blocking === true) {
          failureDetails = {
            reason: `needs-attention: ${dirtyDiff.classification} dirty diff blocked completion`,
            strandedArtifacts: dirtyDiff.strandedArtifacts,
            anomalyIds: [`dirty-diff-${dirtyDiff.classification}`]
          };
          throw new Error(failureDetails.reason);
        }
        const after = await afterHook(hookContext);
        if (!after.ok || after.commit?.commitSha === undefined) {
          failureDetails = after.ok
            ? { reason: 'missing commit sha' }
            : { reason: failureReasonFor(after), strandedArtifacts: after.strandedArtifacts };
          throw new Error(after.ok ? 'missing commit sha' : failureReasonFor(after));
        }
        await finishPass(after.commit.commitSha, featureDir, agentResult);
      } catch (error) {
        const reason = failureDetails.reason ?? (error instanceof Error ? error.message : String(error));
        if (featureDir !== undefined) {
          try {
            await writeFailedStepMarker({
              repositoryPath: request.repositoryPath,
              userDataPath,
              step,
              sessionId,
              failedAt: new Date().toISOString(),
              reason,
              strandedArtifacts: failureDetails.strandedArtifacts,
              anomalyIds: failureDetails.anomalyIds
            });
          } catch (markerError) {
            logger.warn({ channel, context, markerError }, 'failed-step marker write failed');
          }
        }
        terminal({ type: 'done', step, sessionId, status: 'fail', reason });
        logHandlerError(logger, { channel, context, startedAt, now }, error);
      }
    };

    void run();
    return ack;
  });
};
