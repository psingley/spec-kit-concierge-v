import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { activityApi } from './activity.endpoint';
import { rendererActivity } from './activity.factory.spec';
import { installConciergeBridge } from './testBridge';

describe('activity endpoint', () => {
  it('reads activity through preload and validates capped entries', async () => {
    installConciergeBridge({ activity: { read: vi.fn(async () => rendererActivity) } });
    const { store } = createRtkQueryTestStore(activityApi);

    await expect(store.dispatch(activityApi.endpoints.getActivity.initiate({ limit: 25 })).unwrap()).resolves.toEqual(rendererActivity);
    expect(window.concierge.activity!.read).toHaveBeenCalledWith({ limit: 25 });
  });

  it('surfaces renderer factory failures', async () => {
    installConciergeBridge({ activity: { read: vi.fn(async () => ({ entries: [], cap: 100 })) } });
    const { store } = createRtkQueryTestStore(activityApi);

    await expect(store.dispatch(activityApi.endpoints.getActivity.initiate({ limit: 25 })).unwrap()).rejects.toMatchObject({
      status: 'PARSING_ERROR',
      data: { name: 'InvalidActivityState' }
    });
  });
});
