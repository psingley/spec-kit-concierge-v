import type { IpcMain } from 'electron';
import { readResumeSpec } from '../data-layer/git/resumeSpec';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, logHandlerError, logHandlerSuccess, toError } from './handlerUtils';
import {
  createResumeSessionRequest,
  createResumeSessionResponse,
  type ResumeSessionResponse
} from './resumeSession.factory';

export const REPO_RESUME_SESSION_CHANNEL = 'repo:resumeSession';

export type RegisterResumeSessionIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  readSpec?: typeof readResumeSpec;
  now?: () => number;
};

export const registerResumeSessionIpc = ({
  ipcMain,
  logger,
  readSpec = readResumeSpec,
  now = () => performance.now()
}: RegisterResumeSessionIpcOptions): void => {
  ipcMain.handle(REPO_RESUME_SESSION_CHANNEL, async (event, ...args: unknown[]): Promise<ResumeSessionResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createResumeSessionRequest(assertOnePayload(REPO_RESUME_SESSION_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);

      const spec = await readSpec(request.value.worktreePath);
      const response = createResumeSessionResponse(spec);
      if (!response.ok) throw toError(response.error.message);

      logHandlerSuccess(logger, {
        channel: REPO_RESUME_SESSION_CHANNEL,
        context,
        startedAt,
        now,
        detail: { hasSpec: response.value.specMarkdown.length > 0 }
      });
      return response.value;
    } catch (error) {
      logHandlerError(logger, { channel: REPO_RESUME_SESSION_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });
};
