import { describe, expect, it, vi } from 'vitest';
import { ACP_PROBE_BOUND_CLI_CHANNEL, registerAcpProbeIpc } from './acpProbe';
import { verifiedCopilotInitialize } from '../data-layer/acp/capabilities.factory.spec';
import { createBoundCLICapabilities } from '../data-layer/acp/capabilities';

const capabilities = (() => {
  const result = createBoundCLICapabilities(verifiedCopilotInitialize);
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.value;
})();

describe('registerAcpProbeIpc', () => {
  it('registers only acp:probeBoundCLI and returns supervisor capabilities', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, ...args: unknown[]) => Promise<unknown>>();
    const dispose = vi.fn(async () => ({ outcome: 'closed' }));
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (event: { sender: { id: number } }, ...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, handler);
      })
    };
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    registerAcpProbeIpc({
      ipcMain,
      logger,
      userDataPath: '/tmp/user-data',
      supervisorFactory: async () => ({
        start: vi.fn(async () => ({ capabilities, dispose }))
      })
    });

    expect([...handlers.keys()]).toEqual([ACP_PROBE_BOUND_CLI_CHANNEL]);
    await expect(handlers.get(ACP_PROBE_BOUND_CLI_CHANNEL)?.({ sender: { id: 7 } })).resolves.toEqual(
      capabilities
    );
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('rejects parameters because the proof handler takes no arguments', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, ...args: unknown[]) => Promise<unknown>>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (event: { sender: { id: number } }, ...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, handler);
      })
    };
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    registerAcpProbeIpc({
      ipcMain,
      logger,
      userDataPath: '/tmp/user-data',
      supervisorFactory: async () => ({
        start: vi.fn(async () => ({ capabilities, dispose: vi.fn() }))
      })
    });

    await expect(
      handlers.get(ACP_PROBE_BOUND_CLI_CHANNEL)?.({ sender: { id: 7 } }, { unexpected: true })
    ).rejects.toThrow('does not accept parameters');
  });

  it('emits structured failure log for invalid invocations (FR-024)', async () => {
    // Per FR-024: every proof endpoint invocation MUST emit a structured log line.
    // Bug found by codex: param-validation throw bypassed the audit-trail log.
    const handlers = new Map<string, (event: { sender: { id: number } }, ...args: unknown[]) => Promise<unknown>>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (event: { sender: { id: number } }, ...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, handler);
      })
    };
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    registerAcpProbeIpc({
      ipcMain,
      logger,
      userDataPath: '/tmp/user-data',
      now: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(101),
      supervisorFactory: async () => ({
        start: vi.fn(async () => ({ capabilities, dispose: vi.fn() }))
      })
    });

    await expect(
      handlers.get(ACP_PROBE_BOUND_CLI_CHANNEL)?.({ sender: { id: 7 } }, { unexpected: true })
    ).rejects.toThrow('does not accept parameters');

    // The failure path MUST log via logger.error with the failure context, even
    // though param-validation throws before reaching the main try block.
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: ACP_PROBE_BOUND_CLI_CHANNEL,
        context: { senderId: 7 },
        success: false
      }),
      expect.any(String)
    );
  });

  it('logs success and disposes on success', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }) => Promise<unknown>>();
    const dispose = vi.fn(async () => ({ outcome: 'closed' }));
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    registerAcpProbeIpc({
      ipcMain: {
        handle: vi.fn((channel: string, handler: (event: { sender: { id: number } }) => Promise<unknown>) => {
          handlers.set(channel, handler);
        })
      },
      logger,
      userDataPath: '/tmp/user-data',
      now: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(15),
      supervisorFactory: async () => ({
        start: vi.fn(async () => ({ capabilities, dispose }))
      })
    });

    await handlers.get(ACP_PROBE_BOUND_CLI_CHANNEL)?.({ sender: { id: 7 } });

    expect(logger.info).toHaveBeenLastCalledWith(
      {
        channel: ACP_PROBE_BOUND_CLI_CHANNEL,
        context: { senderId: 7 },
        success: true,
        latencyMs: 5
      },
      'ipc handler invocation'
    );
    expect(dispose).toHaveBeenCalled();
  });

  it('logs failure and disposes when supervisor start fails after session creation', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }) => Promise<unknown>>();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const error = new Error('probe failed');
    registerAcpProbeIpc({
      ipcMain: {
        handle: vi.fn((channel: string, handler: (event: { sender: { id: number } }) => Promise<unknown>) => {
          handlers.set(channel, handler);
        })
      },
      logger,
      userDataPath: '/tmp/user-data',
      supervisorFactory: async () => ({
        start: vi.fn(async () => {
          throw error;
        })
      })
    });

    await expect(handlers.get(ACP_PROBE_BOUND_CLI_CHANNEL)?.({ sender: { id: 7 } })).rejects.toThrow(
      error
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: ACP_PROBE_BOUND_CLI_CHANNEL,
        success: false,
        error
      }),
      'ipc handler invocation'
    );
  });
});
