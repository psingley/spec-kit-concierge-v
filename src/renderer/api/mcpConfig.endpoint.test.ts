import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { installConciergeBridge } from './testBridge';
import { mcpConfigApi } from './mcpConfig.endpoint';
import { rendererMcpConfigNeedsAuth } from './mcpConfig.factory.spec';

describe('mcp config endpoint', () => {
  it('checks mcp config through preload', async () => {
    installConciergeBridge({ mcpConfig: { check: vi.fn(async () => rendererMcpConfigNeedsAuth), fix: vi.fn() } });
    const { store } = createRtkQueryTestStore(mcpConfigApi);

    await expect(store.dispatch(mcpConfigApi.endpoints.checkMcpConfig.initiate()).unwrap()).resolves.toEqual(
      rendererMcpConfigNeedsAuth
    );
    expect(window.concierge.mcpConfig!.check).toHaveBeenCalledWith({});
  });
});
