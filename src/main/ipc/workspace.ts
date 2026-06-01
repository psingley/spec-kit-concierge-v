import type { IpcMain } from 'electron';
import { loadAgentManifest } from '../data-layer/agents/loader';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, toError } from './handlerUtils';
import {
  createWorkspaceReadRequest,
  createWorkspaceReadResponse,
  type WorkspaceReadRequest,
  type WorkspaceReadResponse
} from './workspace.factory';

export const WORKSPACE_READ_CHANNEL = 'workspace:read';

export type RegisterWorkspaceIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  readWorkspace?: (request: WorkspaceReadRequest) => Promise<WorkspaceReadResponse>;
  now?: () => number;
};

export const registerWorkspaceIpc = ({
  ipcMain,
  logger,
  readWorkspace,
  now = () => performance.now()
}: RegisterWorkspaceIpcOptions): void => {
  const read =
    readWorkspace ??
    (async (request: WorkspaceReadRequest): Promise<WorkspaceReadResponse> => {
      const manifest = await loadAgentManifest(logger);

      return {
        activeRepoPath: request.repositoryPath,
        agents: Object.entries(manifest.agents).map(([id, agent]) => ({
          id,
          displayName: agent.displayName,
          capabilities: agent.capabilities
        }))
      };
    });

  ipcMain.handle(WORKSPACE_READ_CHANNEL, async (event, ...args: unknown[]): Promise<WorkspaceReadResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);

    try {
      const request = createWorkspaceReadRequest(assertOnePayload(WORKSPACE_READ_CHANNEL, args));
      if (!request.ok) {
        throw toError(request.error.message);
      }
      const response = createWorkspaceReadResponse(await read(request.value));
      if (!response.ok) {
        throw toError(response.error.message);
      }
      logger.info({ channel: WORKSPACE_READ_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');

      return response.value;
    } catch (error) {
      logHandlerError(logger, { channel: WORKSPACE_READ_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });
};
