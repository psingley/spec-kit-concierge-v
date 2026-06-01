import type { IpcMain } from 'electron';
import { checkCopilotMcpConfig, fixCopilotMcpConfig } from '../data-layer/mcp-config/copilotMcp';
import type { McpConfigFixResult, McpConfigStatus } from '../data-layer/mcp-config/types';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, toError } from './handlerUtils';
import { createMcpConfigCheckResponse, createMcpConfigFixRequest, createMcpConfigFixResponse } from './mcpConfig.factory';

export const MCP_CONFIG_CHECK_CHANNEL = 'mcp:config:check';
export const MCP_CONFIG_FIX_CHANNEL = 'mcp:config:fix';

export type RegisterMcpConfigIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  checkMcpConfig?: () => Promise<McpConfigStatus>;
  fixMcpConfig?: (status: McpConfigStatus) => Promise<McpConfigFixResult>;
  now?: () => number;
};

export const registerMcpConfigIpc = ({
  ipcMain,
  logger,
  checkMcpConfig = checkCopilotMcpConfig,
  fixMcpConfig = (status) => fixCopilotMcpConfig({ status }),
  now = () => performance.now()
}: RegisterMcpConfigIpcOptions): void => {
  ipcMain.handle(MCP_CONFIG_CHECK_CHANNEL, async (event, ...args: unknown[]): Promise<McpConfigStatus> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      assertOnePayload(MCP_CONFIG_CHECK_CHANNEL, args);
      const response = createMcpConfigCheckResponse(await checkMcpConfig());
      if (!response.ok) throw toError(response.error.message);
      logger.info({ channel: MCP_CONFIG_CHECK_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now), state: response.value.state }, 'ipc handler invocation');
      return response.value;
    } catch (error) {
      logHandlerError(logger, { channel: MCP_CONFIG_CHECK_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });

  ipcMain.handle(MCP_CONFIG_FIX_CHANNEL, async (event, ...args: unknown[]): Promise<McpConfigFixResult> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createMcpConfigFixRequest(assertOnePayload(MCP_CONFIG_FIX_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const result = createMcpConfigFixResponse(await fixMcpConfig(await checkMcpConfig()));
      if (!result.ok) throw toError(result.error.message);
      logger.info(
        {
          channel: MCP_CONFIG_FIX_CHANNEL,
          context,
          reason: request.value.reason,
          success: true,
          latencyMs: latencyMs(startedAt, now),
          writeKind: result.value.writeKind,
          writeAttempted: result.value.writeAttempted
        },
        'ipc handler invocation'
      );
      return result.value;
    } catch (error) {
      logHandlerError(logger, { channel: MCP_CONFIG_FIX_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });
};
