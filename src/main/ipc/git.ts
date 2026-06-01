import type { IpcMain } from 'electron';
import { readBranchState } from '../data-layer/git/branchState';
import { checkoutBranch, createDraftBranch } from '../data-layer/git/branchSessions';
import { readUncommittedPaths } from '../data-layer/git/uncommittedPaths';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, toError } from './handlerUtils';
import {
  createGitCheckoutRequest,
  createGitCheckoutResponse,
  createGitCreateDraftRequest,
  createGitCreateDraftResponse,
  createGitReadRequest,
  createGitReadResponse,
  type GitCheckoutResponse,
  type GitCreateDraftResponse,
  type GitReadRequest,
  type GitReadResponse
} from './git.factory';

export const GIT_READ_CHANNEL = 'git:read';
export const GIT_CHECKOUT_CHANNEL = 'git:checkout';
export const GIT_CREATE_DRAFT_CHANNEL = 'git:createDraft';

export type RegisterGitIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  readGit?: (request: GitReadRequest) => Promise<GitReadResponse>;
  checkout?: typeof checkoutBranch;
  createDraft?: typeof createDraftBranch;
  now?: () => number;
};

export const registerGitIpc = ({
  ipcMain,
  logger,
  readGit,
  checkout = checkoutBranch,
  createDraft = createDraftBranch,
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

  ipcMain.handle(GIT_CREATE_DRAFT_CHANNEL, async (event, ...args: unknown[]): Promise<GitCreateDraftResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createGitCreateDraftRequest(assertOnePayload(GIT_CREATE_DRAFT_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const fixedDraftNow = Number.parseInt(process.env.CONCIERGE_TEST_DRAFT_NOW ?? '', 10);
      const draftNow = Number.isFinite(fixedDraftNow) ? () => fixedDraftNow : undefined;
      const response = createGitCreateDraftResponse(await createDraft(request.value.repositoryPath, draftNow));
      if (!response.ok) throw toError(response.error.message);
      logger.info({ channel: GIT_CREATE_DRAFT_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return response.value;
    } catch (error) {
      logHandlerError(logger, { channel: GIT_CREATE_DRAFT_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });
};
