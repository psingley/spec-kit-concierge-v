import { beforeEach, describe, expect, it, vi } from 'vitest';

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();
const on = vi.fn();
const off = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld
  },
  ipcRenderer: {
    invoke,
    on,
    off
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
      'activity',
      'repos',
      'branches',
      'artifacts',
      'tasksDetail',
      'copilot'
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
    ['git', 'checkout', 'git:checkout'],
    ['git', 'createDraft', 'git:createDraft'],
    ['steps', 'read', 'steps:read'],
    ['preferences', 'read', 'preferences:read'],
    ['preferences', 'write', 'preferences:write'],
    ['auth', 'status', 'auth:status'],
    ['auth', 'loginGitHub', 'auth:gh:login'],
    ['auth', 'loginCopilot', 'auth:copilot:login'],
    ['auth', 'loginAtlassian', 'auth:atlassian:login'],
    ['session', 'listAcp', 'session:listAcp'],
    ['session', 'createAcp', 'session:createAcp'],
    ['activity', 'read', 'activity:read'],
    ['repos', 'list', 'repos:list'],
    ['branches', 'sessions', 'branches:sessions'],
    ['artifacts', 'read', 'artifacts:read'],
    ['tasksDetail', 'read', 'tasks:detail'],
    ['copilot', 'specify', 'copilot:specify']
  ])('routes %s.%s to %s through ipcRenderer.invoke', async (group, method, channel) => {
    await import('./index');
    const bridge = exposeInMainWorld.mock.calls[0]?.[1] as Record<string, Record<string, (payload: unknown) => Promise<unknown>>>;
    const payload = { proof: channel };

    await bridge[group]![method]!(payload);

    expect(invoke).toHaveBeenCalledWith(channel, payload);
  });

  it('exposes a generic step stream subscription helper while keeping subscribeSpecify compatible', async () => {
    await import('./index');
    const bridge = exposeInMainWorld.mock.calls[0]?.[1] as {
      copilot: {
        subscribeStepStream: (channel: string, subscriptionId: string, callback: (event: unknown) => void) => () => void;
        subscribeSpecify: (subscriptionId: string, callback: (event: unknown) => void) => () => void;
      };
    };
    const callback = vi.fn();

    const unsubscribe = bridge.copilot.subscribeStepStream('copilot:clarify', 'sub-1', callback);
    const listener = on.mock.calls[0]?.[1] as (_event: unknown, payload: unknown) => void;
    listener({}, { subscriptionId: 'sub-other', event: { type: 'progress' } });
    listener({}, { subscriptionId: 'sub-1', event: { type: 'progress', step: 'clarify' } });
    unsubscribe();

    expect(on).toHaveBeenCalledWith('copilot:clarify:event', expect.any(Function));
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ type: 'progress', step: 'clarify' });
    expect(off).toHaveBeenCalledWith('copilot:clarify:event', listener);

    bridge.copilot.subscribeSpecify('sub-2', vi.fn());
    expect(on).toHaveBeenCalledWith('copilot:specify:event', expect.any(Function));
  });
});
