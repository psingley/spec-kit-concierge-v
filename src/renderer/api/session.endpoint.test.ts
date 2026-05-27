import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { sessionApi } from './session.endpoint';
import { rendererSessionCreate, rendererSessionList } from './session.factory.spec';
import { installConciergeBridge } from './testBridge';

describe('session endpoint', () => {
  it('lists ACP sessions through preload and validates them', async () => {
    installConciergeBridge({ session: { listAcp: vi.fn(async () => rendererSessionList), createAcp: vi.fn() } });
    const { store } = createRtkQueryTestStore(sessionApi);

    await expect(store.dispatch(sessionApi.endpoints.listAcpSessions.initiate({ cwd: '/repo' })).unwrap()).resolves.toEqual(rendererSessionList);
    expect(window.concierge.session!.listAcp).toHaveBeenCalledWith({ cwd: '/repo' });
  });

  it('creates ACP sessions through preload and validates them', async () => {
    installConciergeBridge({ session: { listAcp: vi.fn(), createAcp: vi.fn(async () => rendererSessionCreate) } });
    const { store } = createRtkQueryTestStore(sessionApi);
    const args = { cwd: '/repo', mcpServers: [], modelId: 'gpt-5.5' };

    await expect(store.dispatch(sessionApi.endpoints.createAcpSession.initiate(args)).unwrap()).resolves.toEqual(rendererSessionCreate);
    expect(window.concierge.session!.createAcp).toHaveBeenCalledWith({
      cwd: '/repo',
      mcpServers: [],
      modeId: undefined,
      modelId: 'gpt-5.5',
      autopilotDecision: undefined
    });
  });
});
