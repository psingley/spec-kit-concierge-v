import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { stepsApi } from './steps.endpoint';
import { rendererStepState } from './steps.factory.spec';
import { installConciergeBridge } from './testBridge';

describe('steps endpoint', () => {
  it('reads step state through preload and validates it', async () => {
    installConciergeBridge({ steps: { read: vi.fn(async () => rendererStepState) } });
    const { store } = createRtkQueryTestStore(stepsApi);
    const args = { commits: [{ sha: 'abc', message: 'Concierge-Step: setup:done' }] };

    await expect(store.dispatch(stepsApi.endpoints.getStepState.initiate(args)).unwrap()).resolves.toEqual(rendererStepState);
    expect(window.concierge.steps!.read).toHaveBeenCalledWith(args);
  });

  it('surfaces renderer factory failures', async () => {
    installConciergeBridge({ steps: { read: vi.fn(async () => ({ steps: [{}] })) } });
    const { store } = createRtkQueryTestStore(stepsApi);

    await expect(store.dispatch(stepsApi.endpoints.getStepState.initiate({ commits: [] })).unwrap()).rejects.toMatchObject({
      status: 'PARSING_ERROR',
      data: { name: 'InvalidStepState' }
    });
  });
});
