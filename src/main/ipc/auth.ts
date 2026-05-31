import type { IpcMain } from 'electron';
import { loginCopilot, loginGitHub, readCopilotAuthStatus, readGitHubAuthStatus, type LoginResult } from '../data-layer/auth/cliAuth';
import { checkCopilotMcpConfig, fixCopilotMcpConfig } from '../data-layer/mcp-config/copilotMcp';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
import {
  createAuthLoginRequest,
  createAuthLoginResponse,
  createAuthStatusRequest,
  createAuthStatusResponse,
  type AuthLoginResponse,
  type AuthStatusRequest,
  type AuthStatusResponse
} from './auth.factory';

export const AUTH_STATUS_CHANNEL = 'auth:status';
export const AUTH_GH_LOGIN_CHANNEL = 'auth:gh:login';
export const AUTH_COPILOT_LOGIN_CHANNEL = 'auth:copilot:login';
export const AUTH_ATLASSIAN_LOGIN_CHANNEL = 'auth:atlassian:login';

type AuthProvider = AuthStatusRequest['providers'][number];

export type RegisterAuthIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  checkStatus?: (provider: AuthProvider) => Promise<boolean | null>;
  loginGitHubAdapter?: () => Promise<LoginResult>;
  loginCopilotAdapter?: (githubConnected: boolean) => Promise<LoginResult>;
  fixAtlassianAdapter?: () => Promise<LoginResult>;
  setTimeoutFn?: typeof setTimeout;
  now?: () => number;
};

const defaultCheckStatus = async (provider: AuthProvider): Promise<boolean | null> => {
  if (provider === 'github') {
    return (await readGitHubAuthStatus()).authenticated;
  }

  const githubStatus = await readGitHubAuthStatus();
  return (await readCopilotAuthStatus(githubStatus.login)).authenticated;
};

export const registerAuthIpc = ({
  ipcMain,
  logger,
  checkStatus = defaultCheckStatus,
  loginGitHubAdapter = loginGitHub,
  loginCopilotAdapter = loginCopilot,
  fixAtlassianAdapter = async () => {
    const result = await fixCopilotMcpConfig({ status: await checkCopilotMcpConfig() });
    return { status: 'ok', provider: 'atlassian', label: result.activityNotice ?? result.status.message };
  },
  setTimeoutFn = setTimeout,
  now = () => performance.now()
}: RegisterAuthIpcOptions): void => {
  let githubConnected = false;

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
      if (response.ok && response.value.githubLoggedIn === true) {
        githubConnected = true;
      }
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

  const handleLogin = (
    channel: typeof AUTH_GH_LOGIN_CHANNEL | typeof AUTH_COPILOT_LOGIN_CHANNEL | typeof AUTH_ATLASSIAN_LOGIN_CHANNEL,
    provider: 'github' | 'copilot' | 'atlassian',
    work: () => Promise<AuthLoginResponse>
  ): void => {
    ipcMain.handle(channel, async (event, ...args: unknown[]): Promise<AuthLoginResponse> => {
      const startedAt = now();
      const context = getSenderContext(event);
      try {
        const request = createAuthLoginRequest(assertOnePayload(channel, args), provider);
        if (!request.ok) {
          throw toError(request.error.message);
        }
        const response = createAuthLoginResponse(await work());
        if (!response.ok) {
          throw toError(response.error.message);
        }
        logger.info({ channel, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
        return response.value;
      } catch (error) {
        logger.error({ channel, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
        throw error;
      }
    });
  };

  handleLogin(AUTH_GH_LOGIN_CHANNEL, 'github', async () => {
    const result = await loginGitHubAdapter();
    githubConnected = true;
    return result;
  });
  handleLogin(AUTH_COPILOT_LOGIN_CHANNEL, 'copilot', async () => loginCopilotAdapter(githubConnected));
  void setTimeoutFn;
  handleLogin(AUTH_ATLASSIAN_LOGIN_CHANNEL, 'atlassian', fixAtlassianAdapter);
};
