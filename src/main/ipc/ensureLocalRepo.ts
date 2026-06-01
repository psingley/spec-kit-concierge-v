import type { IpcMain } from 'electron';
import { ensureRepoCloned } from '../data-layer/repositories/cloneRepo';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, toError } from './handlerUtils';
import {
  createEnsureLocalRepoRequest,
  createEnsureLocalRepoResponse,
  type EnsureLocalRepoResponse
} from './ensureLocalRepo.factory';

export const ENSURE_LOCAL_REPO_CHANNEL = 'repo:ensureLocal';

export type RegisterEnsureLocalRepoIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  documentsRoot: string;
  ensureCloned?: typeof ensureRepoCloned;
  now?: () => number;
};

export const registerEnsureLocalRepoIpc = ({
  ipcMain,
  logger,
  documentsRoot,
  ensureCloned = ensureRepoCloned,
  now = () => performance.now()
}: RegisterEnsureLocalRepoIpcOptions): void => {
  ipcMain.handle(ENSURE_LOCAL_REPO_CHANNEL, async (event, ...args: unknown[]): Promise<EnsureLocalRepoResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createEnsureLocalRepoRequest(assertOnePayload(ENSURE_LOCAL_REPO_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const result = await ensureCloned({
        owner: request.value.owner,
        name: request.value.name,
        cloneUrl: request.value.cloneUrl,
        documentsRoot
      });
      const response = createEnsureLocalRepoResponse(result);
      if (!response.ok) throw toError(response.error.message);
      logger.info(
        { channel: ENSURE_LOCAL_REPO_CHANNEL, context, success: true, cloned: response.value.cloned, latencyMs: latencyMs(startedAt, now) },
        'ipc handler invocation'
      );
      return response.value;
    } catch (error) {
      logHandlerError(logger, { channel: ENSURE_LOCAL_REPO_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });
};
