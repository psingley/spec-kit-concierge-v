import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { IpcMain } from 'electron';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
import {
  createAuthStatusRequest,
  createAuthStatusResponse,
  type AuthStatusRequest,
  type AuthStatusResponse
} from './auth.factory';

export const AUTH_STATUS_CHANNEL = 'auth:status';

type AuthProvider = AuthStatusRequest['providers'][number];

export type RegisterAuthIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  checkStatus?: (provider: AuthProvider) => Promise<boolean | null>;
  now?: () => number;
};

const execFileAsync = promisify(execFile);

const defaultCheckStatus = async (provider: AuthProvider): Promise<boolean | null> => {
  const command = provider === 'copilot' ? 'copilot' : 'gh';
  const args = provider === 'copilot' ? ['auth', 'status'] : ['auth', 'status'];

  try {
    await execFileAsync(command, args, { shell: false });
    return true;
  } catch {
    return false;
  }
};

export const registerAuthIpc = ({
  ipcMain,
  logger,
  checkStatus = defaultCheckStatus,
  now = () => performance.now()
}: RegisterAuthIpcOptions): void => {
  ipcMain.handle(AUTH_STATUS_CHANNEL, async (event, ...args: unknown[]): Promise<AuthStatusResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);

    try {
      const request = createAuthStatusRequest(assertOnePayload(AUTH_STATUS_CHANNEL, args));
      if (!request.ok) {
        throw toError(request.error.message);
      }
      const response = createAuthStatusResponse({
        copilotLoggedIn: request.value.providers.includes('copilot') ? await checkStatus('copilot') : null,
        githubLoggedIn: request.value.providers.includes('github') ? await checkStatus('github') : null
      });
      if (!response.ok) {
        throw toError(response.error.message);
      }
      logger.info({ channel: AUTH_STATUS_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');

      return response.value;
    } catch (error) {
      logger.error({ channel: AUTH_STATUS_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      throw error;
    }
  });
};
