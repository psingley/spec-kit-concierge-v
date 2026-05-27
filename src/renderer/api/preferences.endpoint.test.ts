import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { preferencesApi } from './preferences.endpoint';
import { rendererPreferences } from './preferences.factory.spec';
import { installConciergeBridge } from './testBridge';

describe('preferences endpoint', () => {
  it('reads preferences through preload and validates them', async () => {
    installConciergeBridge({ preferences: { read: vi.fn(async () => rendererPreferences), write: vi.fn() } });
    const { store } = createRtkQueryTestStore(preferencesApi);

    await expect(store.dispatch(preferencesApi.endpoints.getPreferences.initiate({ scope: 'user' })).unwrap()).resolves.toEqual(rendererPreferences);
    expect(window.concierge.preferences!.read).toHaveBeenCalledWith({ scope: 'user' });
  });

  it('writes preferences through the only Run 4 write endpoint', async () => {
    const written = { hydratedFromDisk: true, theme: 'dark' };
    installConciergeBridge({ preferences: { read: vi.fn(), write: vi.fn(async () => written) } });
    const { store } = createRtkQueryTestStore(preferencesApi);

    await expect(store.dispatch(preferencesApi.endpoints.writePreferences.initiate({ theme: 'dark' })).unwrap()).resolves.toEqual(written);
    expect(window.concierge.preferences!.write).toHaveBeenCalledWith({ theme: 'dark' });
  });
});
