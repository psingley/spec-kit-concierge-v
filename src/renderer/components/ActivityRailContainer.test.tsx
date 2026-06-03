import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { activityBusyChanged, activityReducer, hangSuspectedRecorded, recordActivity } from '../slices/activity';
import { preferencesReducer } from '../slices/preferences';
import { activityVisibilitySet, uiReducer } from '../slices/ui';
import { ACTIVITY_FOLLOW_DEBOUNCE_MS, ActivityRailContainer, followStateFromScrollMetrics } from './ActivityRailContainer';

const makeStore = () =>
  configureStore({
    reducer: {
      activity: activityReducer,
      preferences: preferencesReducer,
      ui: uiReducer
    }
  });

describe('ActivityRailContainer', () => {
  it('computes follow state from one-viewport bottom proximity', () => {
    expect(ACTIVITY_FOLLOW_DEBOUNCE_MS).toBe(150);
    expect(followStateFromScrollMetrics({ scrollTop: 700, scrollHeight: 1000, clientHeight: 200 })).toBe('following');
    expect(followStateFromScrollMetrics({ scrollTop: 599, scrollHeight: 1000, clientHeight: 200 })).toBe('paused');
  });

  it('passes hang suspicion through to the Activity rail while busy', () => {
    const store = makeStore();
    store.dispatch(activityVisibilitySet(true));
    store.dispatch(activityBusyChanged({ busy: true, status: 'Running plan' }));
    store.dispatch(hangSuspectedRecorded({ marker: 'plan-1:2026-06-03T00:00:00.000Z' }));

    render(
      <Provider store={store}>
        <ActivityRailContainer />
      </Provider>
    );

    expect(screen.getByText('possibly stalled')).toBeInTheDocument();
  });

  it('pauses and resumes follow state from debounced scroll metrics', () => {
    vi.useFakeTimers();
    const store = makeStore();
    store.dispatch(activityVisibilitySet(true));
    store.dispatch(recordActivity({
      timestamp: '2026-06-03T00:00:00.000Z',
      level: 'info',
      message: 'first'
    }));

    const { container } = render(
      <Provider store={store}>
        <ActivityRailContainer />
      </Provider>
    );
    const stream = container.querySelector('.activity-stream') as HTMLDivElement;
    Object.defineProperty(stream, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(stream, 'clientHeight', { configurable: true, value: 200 });

    stream.scrollTop = 500;
    fireEvent.scroll(stream);
    act(() => {
      vi.advanceTimersByTime(ACTIVITY_FOLLOW_DEBOUNCE_MS);
    });
    expect(store.getState().activity.followState).toBe('paused');

    stream.scrollTop = 700;
    fireEvent.scroll(stream);
    act(() => {
      vi.advanceTimersByTime(ACTIVITY_FOLLOW_DEBOUNCE_MS);
    });
    expect(store.getState().activity.followState).toBe('following');
    vi.useRealTimers();
  });
});
