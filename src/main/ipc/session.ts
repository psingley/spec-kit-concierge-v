import { app, type IpcMain } from 'electron';
import { loadAgentManifest } from '../data-layer/agents/loader';
import { BoundCLISupervisor } from '../data-layer/acp/supervisor';
import type {
  BoundCLINewSessionResult,
  BoundCLISessionSummary
} from '../data-layer/acp/types';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
import {
  createSessionCreateRequest,
  createSessionCreateResponse,
  createSessionListRequest,
  createSessionListResponse,
  type SessionCreateRequest,
  type SessionCreateResponse,
  type SessionListResponse
} from './session.factory';

export const SESSION_LIST_ACP_CHANNEL = 'session:listAcp';
export const SESSION_CREATE_ACP_CHANNEL = 'session:createAcp';

type Run4AcpSession = {
  listSessions(cwd?: string): Promise<BoundCLISessionSummary[]>;
  newSession(
    cwd: string,
    mcpServers: Record<string, unknown>[],
    options?: { modeId?: string; autopilotDecision?: 'allow' | 'deny'; step?: string }
  ): Promise<BoundCLINewSessionResult>;
  setModel?(sessionId: string, modelId: string): Promise<void>;
  dispose(): Promise<unknown>;
};

export type RegisterSessionIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  sessionFactory?: () => Promise<Run4AcpSession>;
  now?: () => number;
  userDataPath?: string;
};

const createDefaultSessionFactory = (
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>,
  userDataPath: string
) => async (): Promise<Run4AcpSession> => {
  const manifest = await loadAgentManifest(logger);
  const copilot = manifest.agents.copilot;
  if (copilot === undefined) {
    throw new Error('Copilot bound CLI manifest entry is missing.');
  }

  return new BoundCLISupervisor({ agent: copilot, logger, userDataPath }).start();
};

export const registerSessionIpc = ({
  ipcMain,
  logger,
  sessionFactory,
  now = () => performance.now(),
  userDataPath = app.getPath('userData')
}: RegisterSessionIpcOptions): void => {
  const factory = sessionFactory ?? createDefaultSessionFactory(logger, userDataPath);

  ipcMain.handle(SESSION_LIST_ACP_CHANNEL, async (event, ...args: unknown[]): Promise<SessionListResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    let session: Run4AcpSession | undefined;

    try {
      const request = createSessionListRequest(assertOnePayload(SESSION_LIST_ACP_CHANNEL, args));
      if (!request.ok) {
        throw toError(request.error.message);
      }
      session = await factory();
      const response = createSessionListResponse({ sessions: await session.listSessions(request.value.cwd) });
      if (!response.ok) {
        throw toError(response.error.message);
      }
      logger.info({ channel: SESSION_LIST_ACP_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');

      return response.value;
    } catch (error) {
      logger.error({ channel: SESSION_LIST_ACP_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      throw error;
    } finally {
      await session?.dispose();
    }
  });

  ipcMain.handle(SESSION_CREATE_ACP_CHANNEL, async (event, ...args: unknown[]): Promise<SessionCreateResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    let session: Run4AcpSession | undefined;

    try {
      const request = createSessionCreateRequest(assertOnePayload(SESSION_CREATE_ACP_CHANNEL, args));
      if (!request.ok) {
        throw toError(request.error.message);
      }
      session = await factory();
      const created = await createSession(session, request.value);
      const response = createSessionCreateResponse(created);
      if (!response.ok) {
        throw toError(response.error.message);
      }
      logger.info({ channel: SESSION_CREATE_ACP_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');

      return response.value;
    } catch (error) {
      logger.error({ channel: SESSION_CREATE_ACP_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      throw error;
    } finally {
      await session?.dispose();
    }
  });
};

const createSession = async (
  session: Run4AcpSession,
  request: SessionCreateRequest
): Promise<SessionCreateResponse> => {
  const created = await session.newSession(request.cwd, request.mcpServers, {
    modeId: request.modeId,
    autopilotDecision: request.autopilotDecision,
    step: 'session-create'
  });
  if (request.modelId !== undefined) {
    await session.setModel?.(created.sessionId, request.modelId);
  }

  return {
    sessionId: created.sessionId,
    currentModeId: created.currentModeId,
    currentModelId: request.modelId ?? created.currentModelId
  };
};
