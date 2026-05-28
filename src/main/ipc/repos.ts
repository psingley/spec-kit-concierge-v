import type { IpcMain } from 'electron';
import { listRepositories } from '../data-layer/repositories/repoList';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
import { createReposListRequest, createReposListResponse, type ReposListResponse } from './repos.factory';

export const REPOS_LIST_CHANNEL = 'repos:list';

export type RegisterReposIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  listRepos?: typeof listRepositories;
  now?: () => number;
};

export const registerReposIpc = ({
  ipcMain,
  logger,
  listRepos = listRepositories,
  now = () => performance.now()
}: RegisterReposIpcOptions): void => {
  ipcMain.handle(REPOS_LIST_CHANNEL, async (event, ...args: unknown[]): Promise<ReposListResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createReposListRequest(assertOnePayload(REPOS_LIST_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const response = createReposListResponse({ repositories: await listRepos() });
      if (!response.ok) throw toError(response.error.message);
      logger.info({ channel: REPOS_LIST_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return response.value;
    } catch (error) {
      logger.error({ channel: REPOS_LIST_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      throw error;
    }
  });
};
