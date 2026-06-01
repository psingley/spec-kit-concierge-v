import type { IpcMain } from 'electron';
import { app } from 'electron';
import path from 'node:path';
import { listBranchSessions } from '../data-layer/git/branchSessions';
import { resolveLocalRepoPath } from '../data-layer/git/repoClone';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
import { createBranchSessionsRequest, createBranchSessionsResponse, type BranchSessionsResponse } from './branches.factory';

export const BRANCH_SESSIONS_CHANNEL = 'branches:sessions';

export type RegisterBranchesIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  userDataPath?: string;
  listSessions?: typeof listBranchSessions;
  now?: () => number;
};

export const registerBranchesIpc = ({
  ipcMain,
  logger,
  userDataPath = app.getPath('userData'),
  listSessions = listBranchSessions,
  now = () => performance.now()
}: RegisterBranchesIpcOptions): void => {
  ipcMain.handle(BRANCH_SESSIONS_CHANNEL, async (event, ...args: unknown[]): Promise<BranchSessionsResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createBranchSessionsRequest(assertOnePayload(BRANCH_SESSIONS_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);

      // Resolve owner/repo → local path (skip if already absolute)
      const repoPath = request.value.repositoryPath.includes('/')
        && !request.value.repositoryPath.includes('\\')
        && !path.isAbsolute(request.value.repositoryPath)
        && !path.win32.isAbsolute(request.value.repositoryPath)
        ? resolveLocalRepoPath(userDataPath, request.value.repositoryPath)
        : request.value.repositoryPath;

      const response = createBranchSessionsResponse({ sessions: await listSessions(repoPath) });
      if (!response.ok) throw toError(response.error.message);
      logger.info({ channel: BRANCH_SESSIONS_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return response.value;
    } catch (error) {
      logger.error({ channel: BRANCH_SESSIONS_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      throw error;
    }
  });
};
