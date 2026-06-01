import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ACP_PROBE_BOUND_CLI_CHANNEL, registerAcpProbeIpc } from './acpProbe';
import { verifiedCopilotInitialize } from '../data-layer/acp/capabilities.factory.spec';
import { createBoundCLICapabilities, parseModels, parseModes } from '../data-layer/acp/capabilities';
import { AGENT_MODE_URI, type BoundCLINewSessionResult } from '../data-layer/acp/types';

const capabilities = (() => {
  const result = createBoundCLICapabilities(verifiedCopilotInitialize);
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.value;
})();

// Captured shape of the live copilot 1.0.56 session/new response: 14 models on
// SessionModelState.availableModels with currentModelId 'gpt-5.5'.
const liveSessionNewModels = [
  'auto',
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.3-codex',
  'gpt-5.2-codex',
  'gpt-5.2',
  'gpt-5.4-mini',
  'gpt-5-mini',
  'gpt-4.1',
  'claude-sonnet-4.6',
  'claude-sonnet-4.5',
  'claude-haiku-4.5',
  'claude-opus-4.8',
  'claude-opus-4.7'
];

const liveSessionNewState = {
  sessionId: 'probe-session',
  models: {
    availableModels: liveSessionNewModels.map((id) => ({
      modelId: id,
      name: id,
      _meta: { copilotUsage: '1x', copilotEnablement: 'enabled' }
    })),
    currentModelId: 'gpt-5.5'
  },
  modes: {
    availableModes: [{ id: AGENT_MODE_URI, name: 'Agent' }],
    currentModeId: AGENT_MODE_URI
  },
  configOptions: []
};

const newSessionResultFromLive = (): BoundCLINewSessionResult => {
  const parsedModels = parseModels(liveSessionNewState.models);
  const parsedModes = parseModes(liveSessionNewState.modes);
  return {
    sessionId: liveSessionNewState.sessionId,
    currentModeId: parsedModes.current,
    currentModelId: parsedModels.current,
    availableModels: parsedModels.available,
    availableModes: parsedModes.available,
    configOptions: []
  };
};

// Default newSession returns the same single-model state the initialize fixture
// carries, so existing assertions that compare against `capabilities` hold.
const newSessionResultFromInitialize = (): BoundCLINewSessionResult => ({
  sessionId: 'probe-session',
  currentModeId: capabilities.modes.current,
  currentModelId: capabilities.models.current,
  availableModels: capabilities.models.available,
  availableModes: capabilities.modes.available,
  configOptions: capabilities.configOptions
});

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
        start: vi.fn(async () => ({
          capabilities,
          newSession: vi.fn(async () => newSessionResultFromInitialize()),
          dispose
        }))
      })
    });

    expect([...handlers.keys()]).toEqual([ACP_PROBE_BOUND_CLI_CHANNEL]);
    await expect(handlers.get(ACP_PROBE_BOUND_CLI_CHANNEL)?.({ sender: { id: 7 } })).resolves.toEqual(
      capabilities
    );
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('returns capabilities from a test adapter without starting the bound CLI', async () => {
    const adapterDir = await mkdtemp(path.join(os.tmpdir(), 'concierge-capabilities-'));
    const adapterPath = path.join(adapterDir, 'capabilities-adapter.json');
    await writeFile(adapterPath, JSON.stringify(verifiedCopilotInitialize), 'utf8');
    const handlers = new Map<string, (event: { sender: { id: number } }, ...args: unknown[]) => Promise<unknown>>();
    const start = vi.fn(async () => ({
      capabilities,
      newSession: vi.fn(async () => newSessionResultFromInitialize()),
      dispose: vi.fn()
    }));
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
      capabilitiesAdapterPath: adapterPath,
      supervisorFactory: async () => ({ start })
    });

    await expect(handlers.get(ACP_PROBE_BOUND_CLI_CHANNEL)?.({ sender: { id: 7 } })).resolves.toEqual(
      capabilities
    );
    expect(start).not.toHaveBeenCalled();
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
        start: vi.fn(async () => ({
          capabilities,
          newSession: vi.fn(async () => newSessionResultFromInitialize()),
          dispose: vi.fn()
        }))
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
        start: vi.fn(async () => ({
          capabilities,
          newSession: vi.fn(async () => newSessionResultFromInitialize()),
          dispose: vi.fn()
        }))
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
        start: vi.fn(async () => ({
          capabilities,
          newSession: vi.fn(async () => newSessionResultFromInitialize()),
          dispose
        }))
      })
    });

    await handlers.get(ACP_PROBE_BOUND_CLI_CHANNEL)?.({ sender: { id: 7 } });

    expect(logger.info).toHaveBeenLastCalledWith(
      {
        channel: ACP_PROBE_BOUND_CLI_CHANNEL,
        context: { senderId: 7 },
        success: true,
        latencyMs: 5,
        modelCount: capabilities.models.available.length,
        currentModel: capabilities.models.current
      },
      'ipc handler invocation'
    );
    expect(dispose).toHaveBeenCalled();
  });

  it('sources models from session/new (14 live copilot models), not initialize', async () => {
    // ROOT CAUSE: availableModels is on session/new (SessionModelState), never
    // on initialize. The probe must call session/new and overlay its lists so
    // the renderer model picker is populated. Without this, models.available
    // is empty by construction and "Model unavailable" hangs Specify.
    const handlers = new Map<string, (event: { sender: { id: number } }) => Promise<unknown>>();
    const dispose = vi.fn(async () => ({ outcome: 'closed' }));
    const newSession = vi.fn(async () => newSessionResultFromLive());
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    registerAcpProbeIpc({
      ipcMain: {
        handle: vi.fn((channel: string, handler: (event: { sender: { id: number } }) => Promise<unknown>) => {
          handlers.set(channel, handler);
        })
      },
      logger,
      userDataPath: '/tmp/user-data',
      supervisorFactory: async () => ({
        start: vi.fn(async () => ({ capabilities, newSession, dispose }))
      })
    });

    const result = (await handlers.get(ACP_PROBE_BOUND_CLI_CHANNEL)?.({ sender: { id: 7 } })) as {
      models: { available: unknown[]; current?: string };
    };

    expect(newSession).toHaveBeenCalledWith('/tmp/user-data', []);
    expect(result.models.available).toHaveLength(14);
    expect(result.models.current).toBe('gpt-5.5');
    expect(dispose).toHaveBeenCalledTimes(1);
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
        err: error,
        errorDetail: expect.objectContaining({ message: error.message })
      }),
      'ipc handler invocation'
    );
  });
});
