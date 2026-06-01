import { randomUUID } from 'node:crypto';
import type { IpcMain } from 'electron';
import { createWorktree as createWorktreeDefault } from '../data-layer/git/worktreeManager';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, logHandlerError, logHandlerSuccess, toError } from './handlerUtils';
import {
  createStartSessionRequest,
  createStartSessionResponse,
  type StartSessionResponse
} from './startSession.factory';

export const REPO_START_SESSION_CHANNEL = 'repo:startSession';

// Filesystem-safe, collision-resistant session id: a base36 timestamp plus a
// short random suffix keeps it sortable yet unique across concurrent starts.
const mintSessionId = (): string =>
  `session-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;

export type RegisterStartSessionIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  createWorktree?: typeof createWorktreeDefault;
  mintSessionId?: () => string;
  now?: () => number;
};

export const registerStartSessionIpc = ({
  ipcMain,
  logger,
  createWorktree = createWorktreeDefault,
  mintSessionId: mintId = mintSessionId,
  now = () => performance.now()
}: RegisterStartSessionIpcOptions): void => {
  ipcMain.handle(REPO_START_SESSION_CHANNEL, async (event, ...args: unknown[]): Promise<StartSessionResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createStartSessionRequest(assertOnePayload(REPO_START_SESSION_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);

      const { clonePath, defaultBranch } = request.value;
      // No branch is pre-allocated here: the worktree is created DETACHED and
      // spec-kit's before_specify hook names the real branch when specify runs
      // (ADR-0016). allocateBranchName is intentionally NOT called.
      const sessionId = mintId();
      const created = await createWorktree(clonePath, sessionId, defaultBranch);

      const response = createStartSessionResponse({
        sessionId: created.sessionId,
        worktreePath: created.worktreePath
      });
      if (!response.ok) throw toError(response.error.message);

      logHandlerSuccess(logger, {
        channel: REPO_START_SESSION_CHANNEL,
        context,
        startedAt,
        now,
        detail: { sessionId: created.sessionId }
      });
      return response.value;
    } catch (error) {
      logHandlerError(logger, { channel: REPO_START_SESSION_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });
};
