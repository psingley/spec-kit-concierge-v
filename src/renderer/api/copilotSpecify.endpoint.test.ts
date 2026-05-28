import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { api } from './index';
import { activityReducer } from '../slices/activity';
import { sessionReducer } from '../slices/session';

describe('copilot specify endpoint', () => {
  it('dispatches specifyRunFailed for minimal fail done events', async () => {
    let listener: ((event: unknown) => void) | undefined;
    window.concierge = {
      app: { getVersion: vi.fn() },
      acp: { probeBoundCLI: vi.fn() },
      copilot: {
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
    const store = configureStore({
      reducer: {
        [api.reducerPath]: api.reducer,
        activity: activityReducer,
        session: sessionReducer
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware)
    });

    await store.dispatch(api.endpoints.runSpecify.initiate({ repositoryPath: '/repo', branch: 'spec/x', prompt: 'Build it' })).unwrap();
    listener?.({ type: 'done', step: 'specify', sessionId: 'specify-1', status: 'fail', reason: 'before hook failed' });

    expect(store.getState().session.failureReason).toBe('before hook failed');
    expect(store.getState().activity.entries).toEqual([]);
  });
});
