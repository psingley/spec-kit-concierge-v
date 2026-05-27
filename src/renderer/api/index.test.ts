import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { api, RUN2_TAG_TYPES } from './index';

describe('renderer API slice', () => {
  it('exposes only getAppVersion', () => {
    expect(Object.keys(api.endpoints)).toEqual(['getAppVersion']);
  });

  it('dispatches getAppVersion successfully through the base query', async () => {
    window.concierge = {
      app: {
        getVersion: vi.fn(async () => ({ version: '0.1.0' }))
      }
    };
    const { store } = createRtkQueryTestStore(api);

    const result = await store.dispatch(api.endpoints.getAppVersion.initiate()).unwrap();

    expect(result).toEqual({ version: '0.1.0' });
  });

  it('preserves structured IPC failure results', async () => {
    window.concierge = {
      app: {
        getVersion: vi.fn(async () => {
          throw new Error('ipc failed');
        })
      }
    };
    const { store } = createRtkQueryTestStore(api);

    await expect(store.dispatch(api.endpoints.getAppVersion.initiate()).unwrap()).rejects.toEqual({
      status: 'IPC_ERROR',
      data: {
        name: 'Error',
        message: 'ipc failed'
      }
    });
  });

  it('declares the eight tag types exactly once', () => {
    expect(RUN2_TAG_TYPES).toEqual([
      'Workspace',
      'StepState',
      'GitState',
      'Agent',
      'Session',
      'Step',
      'Transcript',
      'Preferences'
    ]);
    expect(new Set(RUN2_TAG_TYPES).size).toBe(8);
  });
});
