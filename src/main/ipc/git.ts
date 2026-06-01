import path from 'node:path';
import type { IpcMain } from 'electron';
import { app } from 'electron';
import { readBranchState } from '../data-layer/git/branchState';
import { checkoutBranch, createDraftBranch } from '../data-layer/git/branchSessions';
import { ensureClone, pushCurrentBranch, resolveLocalRepoPath } from '../data-layer/git/repoClone';
import { readUncommittedPaths } from '../data-layer/git/uncommittedPaths';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
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
  userDataPath?: string;
  readGit?: (request: GitReadRequest) => Promise<GitReadResponse>;
  checkout?: typeof checkoutBranch;
  createDraft?: typeof createDraftBranch;
  cloneRepo?: typeof ensureClone;
  pushBranch?: typeof pushCurrentBranch;
  now?: () => number;
};

export const registerGitIpc = ({
  ipcMain,
  logger,
  userDataPath = app.getPath('userData'),
  readGit,
  checkout = checkoutBranch,
  createDraft = createDraftBranch,
  cloneRepo = ensureClone,
  pushBranch = pushCurrentBranch,
  now = () => performance.now()
}: RegisterGitIpcOptions): void => {
  const resolveRepoPath = (repoPath: string): string => {
    // If it looks like an owner/repo identifier (no backslash, no leading slash), resolve it
    if (repoPath.includes('/') && !repoPath.includes('\\') && !repoPath.startsWith('/')) {
      return resolveLocalRepoPath(userDataPath, repoPath);
    }
    return repoPath;
  };

  const read =
    readGit ??
    (async (request: GitReadRequest): Promise<GitReadResponse> => {
      const localPath = resolveRepoPath(request.repositoryPath);
      const branchState = await readBranchState(localPath);
      const uncommitted = await readUncommittedPaths(localPath, request.paths);

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

  ipcMain.handle(GIT_CHECKOUT_CHANNEL, async (event, ...args: unknown[]): Promise<GitCheckoutResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createGitCheckoutRequest(assertOnePayload(GIT_CHECKOUT_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const localPath = resolveRepoPath(request.value.repositoryPath);
      const response = createGitCheckoutResponse(await checkout(localPath, request.value.branch));
      if (!response.ok) throw toError(response.error.message);
      logger.info({ channel: GIT_CHECKOUT_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return response.value;
    } catch (error) {
      logger.error({ channel: GIT_CHECKOUT_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      throw error;
    }
  });

  ipcMain.handle(GIT_CREATE_DRAFT_CHANNEL, async (event, ...args: unknown[]): Promise<GitCreateDraftResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createGitCreateDraftRequest(assertOnePayload(GIT_CREATE_DRAFT_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);

      // Resolve owner/repo → local path, clone if needed.
      // Absolute paths are pre-existing local repos (test fixtures) — skip clone and push.
      const repoPath = request.value.repositoryPath;
      const localPath = await cloneRepo({
        userDataPath,
        repositoryPath: repoPath,
        defaultBranch: request.value.defaultBranch
      });

      const fixedDraftNow = Number.parseInt(process.env.CONCIERGE_TEST_DRAFT_NOW ?? '', 10);
      const draftNow = Number.isFinite(fixedDraftNow) ? () => fixedDraftNow : undefined;
      const response = createGitCreateDraftResponse(await createDraft(localPath, draftNow));
      if (!response.ok) throw toError(response.error.message);

      // Push the draft branch to origin (skipped for local filesystem paths)
      if (!path.isAbsolute(repoPath)) {
        await pushBranch(localPath);
      }

      logger.info({ channel: GIT_CREATE_DRAFT_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return response.value;
    } catch (error) {
      logger.error({ channel: GIT_CREATE_DRAFT_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      throw error;
    }
  });
};
