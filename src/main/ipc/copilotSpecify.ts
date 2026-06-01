import path from 'node:path';
import { app, type IpcMain } from 'electron';
import { loadAgentManifest } from '../data-layer/agents/loader';
import { BoundCLISupervisor } from '../data-layer/acp/supervisor';
import { beforeSpecifyHook } from '../hooks/beforeSpecify.hook';
import { afterSpecifyHook } from '../hooks/afterSpecify.hook';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
import {
  createCopilotSpecifyAck,
  createCopilotSpecifyRequest,
  createStepStreamEvent,
  type CopilotSpecifyAck,
  type CopilotSpecifyRequest,
  type StepStreamEvent
} from './copilotSpecify.factory';
import {
  createSpecifyReadinessAdapters,
  evaluateSpecifyReadiness,
  type SpecifyReadinessReport
} from './specifyReadiness';

export const COPILOT_SPECIFY_CHANNEL = 'copilot:specify';
export const COPILOT_SPECIFY_EVENT_CHANNEL = 'copilot:specify:event';
export const SPECIFY_READINESS_CHANNEL = 'specify:readiness';

export type SpecifyAgentAdapter = (request: CopilotSpecifyRequest & { sessionId: string; featureDir: string }) => Promise<void>;

export type SpecifyReadinessEvaluator = (request: {
  repositoryPath: string;
  modelId?: string;
}) => Promise<SpecifyReadinessReport>;

export type RegisterCopilotSpecifyIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath?: string;
  agentAdapter?: SpecifyAgentAdapter;
  evaluateReadiness?: SpecifyReadinessEvaluator;
  now?: () => number;
};

// Probe live capabilities via session/new (where availableModels actually
// live) so readiness can verify a model is selectable before the ACP turn.
const probeCapabilities =
  (logger: Pick<MainLogger, 'info' | 'warn' | 'error'>, userDataPath: string) =>
  async (): Promise<{ available: string[]; current?: string }> => {
    const manifest = await loadAgentManifest(logger);
    const agent = manifest.agents.copilot;
    if (agent === undefined) {
      throw new Error('Copilot agent manifest entry is missing.');
    }
    const supervisor = new BoundCLISupervisor({ agent, logger, userDataPath });
    const session = await supervisor.start();
    try {
      const state = await session.newSession(userDataPath, []);
      return {
        available: state.availableModels.map((model) => model.id),
        current: state.currentModelId
      };
    } finally {
      await session.dispose();
    }
  };

const defaultEvaluateReadiness =
  (logger: Pick<MainLogger, 'info' | 'warn' | 'error'>, userDataPath: string): SpecifyReadinessEvaluator =>
  (request) =>
    evaluateSpecifyReadiness(
      request,
      createSpecifyReadinessAdapters({ capabilitiesProbe: probeCapabilities(logger, userDataPath) })
    );

const defaultAgentAdapter =
  (logger: Pick<MainLogger, 'info' | 'warn' | 'error'>, userDataPath: string): SpecifyAgentAdapter =>
async (request) => {
  const manifest = await loadAgentManifest(logger);
  const agent = manifest.agents.copilot;
  if (agent === undefined) {
    throw new Error('Copilot agent manifest entry is missing.');
  }
  const supervisor = new BoundCLISupervisor({ agent, logger, userDataPath });
  const session = await supervisor.start();
  const created = await session.newSession(request.repositoryPath, [], { step: 'specify' });
  if (request.modelId !== undefined) {
    await session.setModel(created.sessionId, request.modelId);
  }
  await session.prompt(
    created.sessionId,
    `Create or update spec.md for this Spec Kit feature request. Keep the generated specification concise and valid markdown.\n\n${request.prompt}`
  );
  await session.dispose();
};

export const registerCopilotSpecifyIpc = ({
  ipcMain,
  logger,
  userDataPath = app.getPath('userData'),
  agentAdapter = defaultAgentAdapter(logger, userDataPath),
  evaluateReadiness = defaultEvaluateReadiness(logger, userDataPath),
  now = () => performance.now()
}: RegisterCopilotSpecifyIpcOptions): void => {
  ipcMain.handle(COPILOT_SPECIFY_CHANNEL, async (event, ...args: unknown[]): Promise<CopilotSpecifyAck> => {
    const startedAt = now();
    const context = getSenderContext(event);
    const request = createCopilotSpecifyRequest(assertOnePayload(COPILOT_SPECIFY_CHANNEL, args));
    if (!request.ok) {
      throw toError(request.error.message);
    }

    const sessionId = `specify-${Date.now().toString(36)}`;
    const ack = createCopilotSpecifyAck({
      subscriptionId: request.value.subscriptionId,
      sessionId,
      step: 'specify',
      accepted: true
    });
    if (!ack.ok) {
      throw toError(ack.error.message);
    }

    const sendEvent = (streamEvent: StepStreamEvent): void => {
      const parsed = createStepStreamEvent(streamEvent);
      if (!parsed.ok) {
        logger.error({ channel: COPILOT_SPECIFY_CHANNEL, context, success: false, error: parsed.error }, 'ipc handler invocation');
        return;
      }
      event.sender.send(COPILOT_SPECIFY_EVENT_CHANNEL, {
        subscriptionId: request.value.subscriptionId,
        event: parsed.value
      });
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
      const featureDir = request.value.repositoryPath;
      const artifactPath = 'spec.md';
      try {
        sendEvent({
          type: 'progress',
          step: 'specify',
          sessionId,
          level: 'info',
          message: 'Preparing Specify lifecycle',
          timestamp: new Date().toISOString()
        });
        // Readiness preflight: verify every precondition BEFORE firing the ACP
        // turn so an unmet condition (e.g. no model selected) blocks honestly
        // instead of firing-and-hanging into the escape-hatch path.
        const readiness = await evaluateReadiness({
          repositoryPath: request.value.repositoryPath,
          modelId: request.value.modelId
        });
        logger.info(
          { channel: SPECIFY_READINESS_CHANNEL, context, checks: readiness.checks, ready: readiness.ready },
          'ipc handler invocation'
        );
        if (!readiness.ready) {
          const reason = readiness.failingCheck?.detail ?? 'Specify preconditions are not met.';
          terminal({ type: 'done', step: 'specify', sessionId, status: 'fail', reason });
          logger.error(
            { channel: SPECIFY_READINESS_CHANNEL, context, success: false, ready: false, failingCheck: readiness.failingCheck?.name },
            'ipc handler invocation'
          );
          return;
        }
        const before = await beforeSpecifyHook({
          repositoryPath: request.value.repositoryPath,
          featureDir,
          sessionId,
          userDataPath,
          authStatus: { githubLoggedIn: true, copilotLoggedIn: true }
        });
        if (!before.ok) {
          throw new Error(before.escapeHatchReason);
        }
        sendEvent({
          type: 'progress',
          step: 'specify',
          sessionId,
          level: 'info',
          message: 'Sending prompt to Copilot',
          timestamp: new Date().toISOString()
        });
        await agentAdapter({ ...request.value, sessionId, featureDir });
        const after = await afterSpecifyHook({
          repositoryPath: request.value.repositoryPath,
          featureDir,
          sessionId,
          userDataPath,
          authStatus: { githubLoggedIn: true, copilotLoggedIn: true }
        });
        if (!after.ok || after.commit?.commitSha === undefined) {
          const reason = after.ok
            ? 'missing commit sha'
            : after.error instanceof Error
              ? `${after.escapeHatchReason}: ${after.error.message}`
              : after.escapeHatchReason;
          throw new Error(reason);
        }
        const specMarkdown = await import('node:fs/promises').then((fs) =>
          fs.readFile(path.join(request.value.repositoryPath, artifactPath), 'utf8')
        );
        terminal({
          type: 'done',
          step: 'specify',
          sessionId,
          status: 'pass',
          specMarkdown,
          artifactPath,
          commitSha: after.commit.commitSha
        });
        logger.info({ channel: COPILOT_SPECIFY_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      } catch (error) {
        terminal({
          type: 'done',
          step: 'specify',
          sessionId,
          status: 'fail',
          reason: error instanceof Error ? error.message : String(error)
        });
        logger.error({ channel: COPILOT_SPECIFY_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      }
    };

    void run();
    return ack.value;
  });
};
