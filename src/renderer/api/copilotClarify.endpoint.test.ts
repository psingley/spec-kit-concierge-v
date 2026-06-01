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

const installConcierge = (capture: { listener?: (event: unknown) => void }, unsubscribe: () => void) => {
  window.concierge = {
    app: { getVersion: vi.fn() },
    acp: { probeBoundCLI: vi.fn() },
    copilot: {
      specify: vi.fn(),
      subscribeSpecify: vi.fn(),
      subscribeStepStream: vi.fn((_channel, _subscriptionId, callback) => {
        capture.listener = callback;
        return unsubscribe;
      }),
      clarify: vi.fn(async (request: unknown) => ({
        subscriptionId: (request as { subscriptionId: string }).subscriptionId,
        sessionId: 'clarify-1',
        step: 'clarify',
        accepted: true
      }))
    }
  };
};

describe('copilot clarify endpoint listener lifecycle (regression: UI freeze on runs > 60s)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('still fires the committed-terminal dispatches after time advances past the old 60s cutoff', async () => {
    const capture: { listener?: (event: unknown) => void } = {};
    const unsubscribe = vi.fn();
    installConcierge(capture, unsubscribe);
    const store = buildStore();

    await store
      .dispatch(api.endpoints.runClarify.initiate({ repositoryPath: '/repo', branch: 'spec/x', operation: 'commit' }))
      .unwrap();

    vi.advanceTimersByTime(120_000);
    expect(unsubscribe).not.toHaveBeenCalled();

    capture.listener?.({
      type: 'done',
      step: 'clarify',
      sessionId: 'clarify-1',
      status: 'pass',
      commitSha: 'clarify-sha',
      artifactPath: 'spec.md',
      summary: { questions: [], answers: [] }
    });

    const state = store.getState();
    // clarifyRunSucceeded
    expect(state.session.clarifyCompletion).not.toBeNull();
    expect(state.session.clarifyRunning).toBe(false);
    // stepCompleted('clarify')
    expect(state.steps.entities.clarify?.status).toBe('complete');
    // clarifyCompletedInWorkspace -> stepper advances + Plan unlocks.
    expect(state.workspace.activeStep).toBe('plan');
    expect(state.workspace.maxReachedStep).toBe('plan');
    // activityBusyChanged(false)
    expect(state.activity.busy).toBe(false);
    expect(state.activity.currentStatus).toBe('Clarify complete');
    // Genuine terminal -> unsubscribed.
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('keeps the listener attached for an intermediate questions-only "Clarify ready" pass', async () => {
    const capture: { listener?: (event: unknown) => void } = {};
    const unsubscribe = vi.fn();
    installConcierge(capture, unsubscribe);
    const store = buildStore();

    await store
      .dispatch(api.endpoints.runClarify.initiate({ repositoryPath: '/repo', branch: 'spec/x', operation: 'next' }))
      .unwrap();

    // Questions delivered, NO commitSha -> intermediate, user must still answer.
    capture.listener?.({
      type: 'done',
      step: 'clarify',
      sessionId: 'clarify-1',
      status: 'pass',
      summary: {
        questions: [{ id: 'q1', text: 'Pick one', position: 1, choices: [{ key: 'a', label: 'A' }] }],
        answers: []
      }
    });

    expect(store.getState().activity.currentStatus).toBe('Clarify ready');
    // Intermediate event must NOT tear down the listener.
    expect(unsubscribe).not.toHaveBeenCalled();

    // A later committed terminal can still arrive and be processed.
    capture.listener?.({
      type: 'done',
      step: 'clarify',
      sessionId: 'clarify-1',
      status: 'pass',
      commitSha: 'clarify-sha',
      summary: { questions: [], answers: [] }
    });
    expect(store.getState().steps.entities.clarify?.status).toBe('complete');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('treats a pass with no commitSha and zero questions as a no-questions-needed terminal', async () => {
    const capture: { listener?: (event: unknown) => void } = {};
    const unsubscribe = vi.fn();
    installConcierge(capture, unsubscribe);
    const store = buildStore();

    await store
      .dispatch(api.endpoints.runClarify.initiate({ repositoryPath: '/repo', branch: 'spec/x', operation: 'next' }))
      .unwrap();

    expect(store.getState().session.clarifyRunning).toBe(true);

    capture.listener?.({
      type: 'done',
      step: 'clarify',
      sessionId: 'clarify-1',
      status: 'pass',
      summary: { questions: [], answers: [] }
    });

    const state = store.getState();
    // clarifyNoQuestionsNeeded -> clears running, sets the flag.
    expect(state.session.clarifyRunning).toBe(false);
    expect(state.session.clarifyNoQuestionsNeeded).toBe(true);
    expect(state.activity.busy).toBe(false);
    expect(state.activity.currentStatus).toBe('No clarifications needed');
    // Terminal for a no-questions next-run -> listener torn down.
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes on a fail terminal', async () => {
    const capture: { listener?: (event: unknown) => void } = {};
    const unsubscribe = vi.fn();
    installConcierge(capture, unsubscribe);
    const store = buildStore();

    await store
      .dispatch(api.endpoints.runClarify.initiate({ repositoryPath: '/repo', branch: 'spec/x', operation: 'commit' }))
      .unwrap();

    capture.listener?.({ type: 'done', step: 'clarify', sessionId: 'clarify-1', status: 'fail', reason: 'boom' });

    expect(store.getState().session.clarifyFailureReason).toBe('boom');
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    // Late event must not double-unsubscribe.
    capture.listener?.({ type: 'done', step: 'clarify', sessionId: 'clarify-1', status: 'fail', reason: 'late noise' });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
