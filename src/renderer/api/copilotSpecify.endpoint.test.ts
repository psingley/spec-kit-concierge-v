import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './index';
import { activityReducer } from '../slices/activity';
import { sessionReducer } from '../slices/session';
import { stepsReducer } from '../slices/steps';
import { workspaceReducer } from '../slices/workspace';

const buildStore = () =>
  configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      activity: activityReducer,
      session: sessionReducer,
      steps: stepsReducer,
      workspace: workspaceReducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware)
  });

describe('copilot specify endpoint', () => {
  it('dispatches specifyRunFailed for minimal fail done events', async () => {
    let listener: ((event: unknown) => void) | undefined;
    window.concierge = {
      app: { getVersion: vi.fn() },
      acp: { probeBoundCLI: vi.fn() },
      copilot: {
        subscribeStepStream: vi.fn(),
        subscribeSpecify: vi.fn((_subscriptionId, callback) => {
          listener = callback;
          return vi.fn();
        }),
        specify: vi.fn(async (request: unknown) => ({
          subscriptionId: (request as { subscriptionId: string }).subscriptionId,
          sessionId: 'specify-1',
          step: 'specify',
          accepted: true
        }))
      }
    };
    const store = buildStore();

    await store.dispatch(api.endpoints.runSpecify.initiate({ repositoryPath: '/repo', branch: 'spec/x', prompt: 'Build it' })).unwrap();
    listener?.({ type: 'done', step: 'specify', sessionId: 'specify-1', status: 'fail', reason: 'before hook failed' });

    expect(store.getState().session.failureReason).toBe('before hook failed');
    expect(store.getState().activity.entries).toEqual([]);
  });

  describe('listener lifecycle (regression: UI freeze on runs > 60s)', () => {
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
          subscribeStepStream: vi.fn(),
          subscribeSpecify: vi.fn((_subscriptionId, callback) => {
            listener = callback;
            return unsubscribe;
          }),
          specify: vi.fn(async (request: unknown) => ({
            subscriptionId: (request as { subscriptionId: string }).subscriptionId,
            sessionId: 'specify-1',
            step: 'specify',
            accepted: true
          }))
        }
      };
      const store = buildStore();

      await store
        .dispatch(api.endpoints.runSpecify.initiate({ repositoryPath: '/repo', branch: 'spec/x', prompt: 'Build it' }))
        .unwrap();

      // A real Copilot run takes ~370s. Advance well past the old hardcoded 60s cutoff
      // WITHOUT delivering a terminal event — the listener must still be attached.
      vi.advanceTimersByTime(120_000);
      expect(unsubscribe).not.toHaveBeenCalled();

      // Now the genuine terminal arrives, long after the old cutoff.
      listener?.({
        type: 'done',
        step: 'specify',
        sessionId: 'specify-1',
        status: 'pass',
        specMarkdown: '# Spec',
        artifactPath: 'specs/0006/spec.md',
        commitSha: 'abc123',
        branch: 'spec/new'
      });

      const state = store.getState();
      // specifyRunSucceeded
      expect(state.session.specifyRunning).toBe(false);
      expect(state.session.commitSha).toBe('abc123');
      // stepCompleted('specify')
      expect(state.steps.entities.specify?.status).toBe('complete');
      // stepPending('clarify')
      expect(state.steps.entities.clarify?.status).toBe('pending');
      // branchUpdated
      expect(state.workspace.branch).toBe('spec/new');
      // activityBusyChanged(false)
      expect(state.activity.busy).toBe(false);
      expect(state.activity.currentStatus).toBe('Specify complete');
    });

    it('unsubscribes after the terminal event and ignores further events', async () => {
      let listener: ((event: unknown) => void) | undefined;
      const unsubscribe = vi.fn();
      window.concierge = {
        app: { getVersion: vi.fn() },
        acp: { probeBoundCLI: vi.fn() },
        copilot: {
          subscribeStepStream: vi.fn(),
          subscribeSpecify: vi.fn((_subscriptionId, callback) => {
            listener = callback;
            return unsubscribe;
          }),
          specify: vi.fn(async (request: unknown) => ({
            subscriptionId: (request as { subscriptionId: string }).subscriptionId,
            sessionId: 'specify-1',
            step: 'specify',
            accepted: true
          }))
        }
      };
      const store = buildStore();

      await store
        .dispatch(api.endpoints.runSpecify.initiate({ repositoryPath: '/repo', branch: 'spec/x', prompt: 'Build it' }))
        .unwrap();

      listener?.({
        type: 'done',
        step: 'specify',
        sessionId: 'specify-1',
        status: 'pass',
        commitSha: 'abc123'
      });

      // Terminal -> IPC delivery is detached so no further events reach this run.
      expect(unsubscribe).toHaveBeenCalledTimes(1);

      // Teardown is idempotent: the safety-ceiling timer firing later must not unsubscribe again.
      vi.advanceTimersByTime(3_600_000);
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('does not leak the listener: the safety ceiling tears down if no terminal arrives', async () => {
      let listener: ((event: unknown) => void) | undefined;
      const unsubscribe = vi.fn();
      window.concierge = {
        app: { getVersion: vi.fn() },
        acp: { probeBoundCLI: vi.fn() },
        copilot: {
          subscribeStepStream: vi.fn(),
          subscribeSpecify: vi.fn((_subscriptionId, callback) => {
            listener = callback;
            return unsubscribe;
          }),
          specify: vi.fn(async (request: unknown) => ({
            subscriptionId: (request as { subscriptionId: string }).subscriptionId,
            sessionId: 'specify-1',
            step: 'specify',
            accepted: true
          }))
        }
      };
      const store = buildStore();

      await store
        .dispatch(api.endpoints.runSpecify.initiate({ repositoryPath: '/repo', branch: 'spec/x', prompt: 'Build it' }))
        .unwrap();
      expect(listener).toBeDefined();

      // No terminal ever arrives. The 60-minute ceiling eventually tears the listener down.
      expect(unsubscribe).not.toHaveBeenCalled();
      vi.advanceTimersByTime(3_600_000);
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
