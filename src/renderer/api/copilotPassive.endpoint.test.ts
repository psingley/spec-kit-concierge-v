import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './index';
import { activityReducer } from '../slices/activity';
import { sessionReducer } from '../slices/session';
import { stepsReducer } from '../slices/steps';

const buildStore = () =>
  configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      activity: activityReducer,
      session: sessionReducer,
      steps: stepsReducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware)
  });

describe('copilot passive step endpoint listener lifecycle (regression: UI freeze on runs > 60s)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('still fires the terminal pass dispatches after time advances past the old 60s cutoff', async () => {
    let listener: ((event: unknown) => void) | undefined;
    const unsubscribe = vi.fn();
    window.concierge = {
      app: { getVersion: vi.fn() },
      acp: { probeBoundCLI: vi.fn() },
      copilot: {
        specify: vi.fn(),
        subscribeSpecify: vi.fn(),
        subscribeStepStream: vi.fn((_channel, _subscriptionId, callback) => {
          listener = callback;
          return unsubscribe;
        }),
        plan: vi.fn(async (request: unknown) => ({
          subscriptionId: (request as { subscriptionId: string }).subscriptionId,
          sessionId: 'plan-1',
          step: 'plan',
          accepted: true
        }))
      }
    };
    const store = buildStore();

    await store
      .dispatch(api.endpoints.runPassiveStep.initiate({ step: 'plan', repositoryPath: '/repo', branch: 'spec/x' }))
      .unwrap();

    vi.advanceTimersByTime(120_000);
    expect(unsubscribe).not.toHaveBeenCalled();

    listener?.({
      type: 'done',
      step: 'plan',
      sessionId: 'plan-1',
      status: 'pass',
      commitSha: 'plan-sha',
      summary: { artifacts: [] }
    });

    const state = store.getState();
    // passiveStepRunSucceeded
    expect(state.session.passiveSteps.plan.running).toBe(false);
    expect(state.session.passiveSteps.plan.commitSha).toBe('plan-sha');
    // stepCompleted('plan')
    expect(state.steps.entities.plan?.status).toBe('complete');
    // activityBusyChanged(false)
    expect(state.activity.busy).toBe(false);
    expect(state.activity.currentStatus).toBe('plan complete');
  });

  it('unsubscribes after the terminal event', async () => {
    let listener: ((event: unknown) => void) | undefined;
    const unsubscribe = vi.fn();
    window.concierge = {
      app: { getVersion: vi.fn() },
      acp: { probeBoundCLI: vi.fn() },
      copilot: {
        specify: vi.fn(),
        subscribeSpecify: vi.fn(),
        subscribeStepStream: vi.fn((_channel, _subscriptionId, callback) => {
          listener = callback;
          return unsubscribe;
        }),
        tasks: vi.fn(async (request: unknown) => ({
          subscriptionId: (request as { subscriptionId: string }).subscriptionId,
          sessionId: 'tasks-1',
          step: 'tasks',
          accepted: true
        }))
      }
    };
    const store = buildStore();

    await store
      .dispatch(api.endpoints.runPassiveStep.initiate({ step: 'tasks', repositoryPath: '/repo', branch: 'spec/x' }))
      .unwrap();

    listener?.({ type: 'done', step: 'tasks', sessionId: 'tasks-1', status: 'pass', commitSha: 'tasks-sha', summary: { artifacts: [] } });
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    // Late event must not double-unsubscribe.
    listener?.({ type: 'done', step: 'tasks', sessionId: 'tasks-1', status: 'fail', reason: 'late noise' });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
