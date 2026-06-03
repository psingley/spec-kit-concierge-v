import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { activityBusyChanged, activityReducer, hangSuspectedRecorded } from '../slices/activity';
import { preferencesReducer } from '../slices/preferences';
import { activityVisibilitySet, uiReducer } from '../slices/ui';
import { ActivityRailContainer } from './ActivityRailContainer';

const makeStore = () =>
  configureStore({
    reducer: {
      activity: activityReducer,
      preferences: preferencesReducer,
      ui: uiReducer
    }
  });

describe('ActivityRailContainer', () => {
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
});
