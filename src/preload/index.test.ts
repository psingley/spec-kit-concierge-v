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

  it('exposes narrow bridge groups without raw Electron APIs', async () => {
    await import('./index');

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    const [name, bridge] = exposeInMainWorld.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe('concierge');
    expect(Object.keys(bridge)).toEqual([
      'app',
      'acp',
      'workspace',
      'git',
      'steps',
      'preferences',
      'auth',
      'session',
      'activity'
    ]);
    expect(Object.keys(bridge.app as Record<string, unknown>)).toEqual(['getVersion']);
    expect(Object.keys(bridge.acp as Record<string, unknown>)).toEqual(['probeBoundCLI']);
    expect(Object.keys(bridge.preferences as Record<string, unknown>)).toEqual(['read', 'write']);
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

  it.each([
    ['workspace', 'read', 'workspace:read'],
    ['git', 'read', 'git:read'],
    ['steps', 'read', 'steps:read'],
    ['preferences', 'read', 'preferences:read'],
    ['preferences', 'write', 'preferences:write'],
    ['auth', 'status', 'auth:status'],
    ['session', 'listAcp', 'session:listAcp'],
    ['session', 'createAcp', 'session:createAcp'],
    ['activity', 'read', 'activity:read']
  ])('routes %s.%s to %s through ipcRenderer.invoke', async (group, method, channel) => {
    await import('./index');
    const bridge = exposeInMainWorld.mock.calls[0]?.[1] as Record<string, Record<string, (payload: unknown) => Promise<unknown>>>;
    const payload = { proof: channel };

    await bridge[group]![method]!(payload);

    expect(invoke).toHaveBeenCalledWith(channel, payload);
  });
});
