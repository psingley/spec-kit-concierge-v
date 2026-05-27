import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { authApi } from './auth.endpoint';
import { rendererAuthStatus } from './auth.factory.spec';
import { installConciergeBridge } from './testBridge';

describe('auth endpoint', () => {
  it('reads auth status through preload and validates nullable booleans', async () => {
    installConciergeBridge({ auth: { status: vi.fn(async () => rendererAuthStatus) } });
    const { store } = createRtkQueryTestStore(authApi);

    await expect(store.dispatch(authApi.endpoints.getAuthStatus.initiate({ providers: ['copilot', 'github'] })).unwrap()).resolves.toEqual(rendererAuthStatus);
    expect(window.concierge.auth!.status).toHaveBeenCalledWith({ providers: ['copilot', 'github'] });
  });

  it('surfaces renderer factory failures', async () => {
    installConciergeBridge({ auth: { status: vi.fn(async () => ({ copilotLoggedIn: 'yes', githubLoggedIn: null })) } });
    const { store } = createRtkQueryTestStore(authApi);

    await expect(store.dispatch(authApi.endpoints.getAuthStatus.initiate({ providers: ['copilot'] })).unwrap()).rejects.toMatchObject({
      status: 'PARSING_ERROR',
      data: { name: 'InvalidAuthStatus' }
    });
  });
});
