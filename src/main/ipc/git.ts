import type { IpcMain } from 'electron';
import { readBranchState } from '../data-layer/git/branchState';
import { readUncommittedPaths } from '../data-layer/git/uncommittedPaths';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
import {
  createGitReadRequest,
  createGitReadResponse,
  type GitReadRequest,
  type GitReadResponse
} from './git.factory';

export const GIT_READ_CHANNEL = 'git:read';

export type RegisterGitIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  readGit?: (request: GitReadRequest) => Promise<GitReadResponse>;
  now?: () => number;
};

export const registerGitIpc = ({
  ipcMain,
  logger,
  readGit,
  now = () => performance.now()
}: RegisterGitIpcOptions): void => {
  const read =
    readGit ??
    (async (request: GitReadRequest): Promise<GitReadResponse> => {
      const branchState = await readBranchState(request.repositoryPath);
      const uncommitted = await readUncommittedPaths(request.repositoryPath, request.paths);

      return {
        branch: branchState.branch,
        ahead: branchState.ahead,
        behind: branchState.behind,
        dirty: branchState.dirty,
        uncommittedPaths: uncommitted.changedPaths
      };
    });

  ipcMain.handle(GIT_READ_CHANNEL, async (event, ...args: unknown[]): Promise<GitReadResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);

    try {
      const request = createGitReadRequest(assertOnePayload(GIT_READ_CHANNEL, args));
      if (!request.ok) {
        throw toError(request.error.message);
      }
      const response = createGitReadResponse(await read(request.value));
      if (!response.ok) {
        throw toError(response.error.message);
      }
      logger.info({ channel: GIT_READ_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');

      return response.value;
    } catch (error) {
      logger.error({ channel: GIT_READ_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      throw error;
    }
  });
};
