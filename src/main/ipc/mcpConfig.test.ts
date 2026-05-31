import { describe, expect, it, vi } from 'vitest';
import { MCP_CONFIG_CHECK_CHANNEL, MCP_CONFIG_FIX_CHANNEL, registerMcpConfigIpc } from './mcpConfig';

describe('mcp config ipc', () => {
  it('registers check and fix handlers with structured work adapters', async () => {
    const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>();
    const ipcMain = { handle: vi.fn((channel: string, handler: (...args: unknown[]) => Promise<unknown>) => handlers.set(channel, handler)) };
    const logger = { info: vi.fn(), error: vi.fn() };
    const check = vi.fn(async () => ({
      state: 'not_configured' as const,
      configPath: '/tmp/mcp-config.json',
      isLegacyEndpoint: false,
      tokenFilePresent: false,
      message: 'missing'
    }));
    const fix = vi.fn(async () => ({
      status: await check(),
      writeAttempted: true,
      writeKind: 'configured' as const,
      activityNotice: 'Configured Atlassian MCP for GitHub Copilot CLI.'
    }));

    registerMcpConfigIpc({ ipcMain, logger, checkMcpConfig: check, fixMcpConfig: fix, now: () => 1 });

    await expect(handlers.get(MCP_CONFIG_CHECK_CHANNEL)?.({ sender: { id: 1 } }, {})).resolves.toMatchObject({ state: 'not_configured' });
    await expect(handlers.get(MCP_CONFIG_FIX_CHANNEL)?.({ sender: { id: 1 } }, { reason: 'startup' })).resolves.toMatchObject({
      writeAttempted: true,
      writeKind: 'configured'
    });
  });
});
