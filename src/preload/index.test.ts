import { beforeEach, describe, expect, it, vi } from 'vitest';

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld
  },
  ipcRenderer: {
    invoke
  }
}));

describe('preload concierge bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('exposes app version and exactly one ACP proof bridge without raw Electron APIs', async () => {
    await import('./index');

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    const [name, bridge] = exposeInMainWorld.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe('concierge');
    expect(Object.keys(bridge)).toEqual(['app', 'acp']);
    expect(Object.keys(bridge.app as Record<string, unknown>)).toEqual(['getVersion']);
    expect(Object.keys(bridge.acp as Record<string, unknown>)).toEqual(['probeBoundCLI']);
    expect(bridge).not.toHaveProperty('ipcRenderer');
  });

  it('routes the ACP proof bridge to acp:probeBoundCLI', async () => {
    await import('./index');
    const bridge = exposeInMainWorld.mock.calls[0]?.[1] as {
      acp: { probeBoundCLI: () => Promise<unknown> };
    };

    await bridge.acp.probeBoundCLI();

    expect(invoke).toHaveBeenCalledWith('acp:probeBoundCLI');
  });
});
