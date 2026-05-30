import type { IpcMain } from 'electron';
import { STEP_ARTIFACT_MANIFEST, expectedArtifactsForStep, type StepName } from '../hooks/manifest';
import { captureAnalyzeReport } from '../domain/evidence/analyzeReport';
import { discoverOptionalArtifacts } from '../domain/factories/factoryUtils';
import type { BoundCLIPromptUpdate } from '../data-layer/acp/types';
import type { StepHookContext, StepHookResult } from '../hooks/types';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
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
      const terminal = (streamEvent: Extract<StepStreamEvent, { type: 'done' }>): void => {
        if (terminalSent) {
          return;
        }
        terminalSent = true;
        sendEvent(streamEvent);
      };
      try {
        if (controller.signal.aborted) {
          throw new Error('aborted');
        }
        const featureDir = request.repositoryPath;
        const hookContext = {
          repositoryPath: request.repositoryPath,
          featureDir,
          sessionId,
          userDataPath,
          authStatus: { githubLoggedIn: true, copilotLoggedIn: true }
        };
        const before = await beforeHook(hookContext);
        if (!before.ok) {
          throw new Error(before.escapeHatchReason);
        }
        sendEvent({ type: 'progress', step, sessionId, level: 'info', message: `Running ${step}`, timestamp: new Date().toISOString() });
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
        const after = await afterHook(hookContext);
        if (!after.ok || after.commit?.commitSha === undefined) {
          throw new Error(after.ok ? 'missing commit sha' : after.escapeHatchReason);
        }
        if (step === 'analyze') {
          await captureAnalyzeReport({
            userDataPath,
            featureDir,
            sessionId,
            analyzeCommitSha: after.commit.commitSha,
            updates: agentResult?.updates ?? []
          });
        }
        terminal({ type: 'done', step, sessionId, status: 'pass', commitSha: after.commit.commitSha, summary: await summaryForStep(step, featureDir) });
        logger.info({ channel, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      } catch (error) {
        terminal({ type: 'done', step, sessionId, status: 'fail', reason: error instanceof Error ? error.message : String(error) });
        logger.error({ channel, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      }
    };

    void run();
    return ack;
  });
};
