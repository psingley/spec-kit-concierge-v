import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { activityReducer } from '../slices/activity';
import { preferencesReducer, preferencesUpdated } from '../slices/preferences';
import { sessionReducer } from '../slices/session';
import { activityVisibilitySet, uiReducer } from '../slices/ui';
import { ActivityPillContainer } from './ActivityPillContainer';

const makeStore = () =>
  configureStore({
    reducer: {
      activity: activityReducer,
      preferences: preferencesReducer,
      session: sessionReducer,
      ui: uiReducer
    }
  });

describe('ActivityPillContainer', () => {
  it('persists an explicit collapsed activity preference when the visible rail is toggled closed', () => {
    const store = makeStore();

    render(
      <Provider store={store}>
        <ActivityPillContainer />
      </Provider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }));

    expect(store.getState().preferences.activitySide).toBe('hidden');
    expect(store.getState().ui.showActivity).toBe(false);
  });

  it('persists the existing visible side when the collapsed rail is toggled open', () => {
    const store = makeStore();
    store.dispatch(preferencesUpdated({ activitySide: 'left' }));
    store.dispatch(activityVisibilitySet(false));

    render(
      <Provider store={store}>
        <ActivityPillContainer />
      </Provider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }));

    expect(store.getState().preferences.activitySide).toBe('left');
    expect(store.getState().ui.showActivity).toBe(true);
  });

  it('persists right as the visible side when reopening a saved hidden rail', () => {
    const store = makeStore();
    store.dispatch(preferencesUpdated({ activitySide: 'hidden' }));
    store.dispatch(activityVisibilitySet(false));

    render(
      <Provider store={store}>
        <ActivityPillContainer />
      </Provider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }));

    expect(store.getState().preferences.activitySide).toBe('right');
    expect(store.getState().ui.showActivity).toBe(true);
  });
});
