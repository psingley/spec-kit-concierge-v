import type { IpcMain } from 'electron';
import { readBranchState } from '../data-layer/git/branchState';
import { checkoutBranch } from '../data-layer/git/branchSessions';
import { resetToCleanMain } from '../data-layer/git/resetToCleanMain';
import { readUncommittedPaths } from '../data-layer/git/uncommittedPaths';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, logHandlerSuccess, toError } from './handlerUtils';
import {
  createGitCheckoutRequest,
  createGitCheckoutResponse,
  createGitResetMainRequest,
  createGitResetMainResponse,
  createGitReadRequest,
  createGitReadResponse,
  type GitCheckoutResponse,
  type GitResetMainResponse,
  type GitReadRequest,
  type GitReadResponse
} from './git.factory';

export const GIT_READ_CHANNEL = 'git:read';
export const GIT_CHECKOUT_CHANNEL = 'git:checkout';
export const GIT_RESET_MAIN_CHANNEL = 'git:resetMain';

export type RegisterGitIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  readGit?: (request: GitReadRequest) => Promise<GitReadResponse>;
  checkout?: typeof checkoutBranch;
  resetMain?: typeof resetToCleanMain;
  now?: () => number;
};

export const registerGitIpc = ({
  ipcMain,
  logger,
  readGit,
  checkout = checkoutBranch,
  resetMain = resetToCleanMain,
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
      logHandlerError(logger, { channel: GIT_READ_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });

  ipcMain.handle(GIT_CHECKOUT_CHANNEL, async (event, ...args: unknown[]): Promise<GitCheckoutResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createGitCheckoutRequest(assertOnePayload(GIT_CHECKOUT_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const response = createGitCheckoutResponse(await checkout(request.value.repositoryPath, request.value.branch));
      if (!response.ok) throw toError(response.error.message);
      logger.info({ channel: GIT_CHECKOUT_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return response.value;
    } catch (error) {
      logHandlerError(logger, { channel: GIT_CHECKOUT_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });

  ipcMain.handle(GIT_RESET_MAIN_CHANNEL, async (event, ...args: unknown[]): Promise<GitResetMainResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createGitResetMainRequest(assertOnePayload(GIT_RESET_MAIN_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const result = await resetMain(request.value.repositoryPath, request.value.defaultBranch);
      const response = createGitResetMainResponse(result);
      if (!response.ok) throw toError(response.error.message);
      // Principle XV: log the catch-up evidence so the line proves
      // "caught up: <before> -> <after> (+N commits on <branch>)" — or, on the
      // local-only path, a clear "no origin catch-up" with commitsAdvanced 0.
      logHandlerSuccess(logger, {
        channel: GIT_RESET_MAIN_CHANNEL,
        context,
        startedAt,
        now,
        detail: {
          branch: result.branch,
          beforeSha: result.beforeSha,
          afterSha: result.afterSha,
          originSha: result.originSha,
          commitsAdvanced: result.commitsAdvanced,
          caughtUp: result.beforeSha === null ? 'local-only, no origin catch-up' : `${result.beforeSha} -> ${result.afterSha} (+${result.commitsAdvanced} on ${result.branch})`
        }
      });
      return response.value;
    } catch (error) {
      logHandlerError(logger, { channel: GIT_RESET_MAIN_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });
};
