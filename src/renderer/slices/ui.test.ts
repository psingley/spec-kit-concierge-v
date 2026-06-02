import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import {
  selectUiActiveView,
  selectUiShowJiraSubmission,
  selectUiSidebarOpen,
  selectUiState,
  selectUiTheme,
  selectUiToasts
} from './ui.selectors';
import uiReducer, { modalClosed, modalOpened, toastDismissed, toastShown } from './ui';

describe('ui slice', () => {
  it('initializes to the Run 4 locked state', () => {
    expect(uiReducer(undefined, { type: 'test/init' })).toEqual({
      theme: 'system',
      sidebarOpen: true,
      activeView: null,
      showActivity: false,
      showCustomize: false,
      showAbout: false,
      showRequest: false,
      showJiraSubmission: false,
      openMenu: null,
      toasts: []
    });
  });

  it('exposes base selectors through RootState', () => {
    const state = createProductStore().getState();

    expect(selectUiState(state)).toBe(state.ui);
    expect(selectUiTheme(state)).toBe('system');
    expect(selectUiSidebarOpen(state)).toBe(true);
    expect(selectUiActiveView(state)).toBeNull();
    expect(selectUiShowJiraSubmission(state)).toBe(false);
    expect(selectUiToasts(state)).toEqual([]);
  });

  it('opens and closes the JIRA submission modal flag', () => {
    const opened = uiReducer(undefined, modalOpened('showJiraSubmission'));
    expect(opened.showJiraSubmission).toBe(true);

    const closed = uiReducer(opened, modalClosed('showJiraSubmission'));
    expect(closed.showJiraSubmission).toBe(false);
  });

  it('adds generated toast entries and dismisses them by id', () => {
    const withToast = uiReducer(undefined, toastShown({ level: 'error', message: 'Something failed' }));
    expect(withToast.toasts).toHaveLength(1);
    expect(withToast.toasts[0]).toMatchObject({ level: 'error', message: 'Something failed' });
    expect(withToast.toasts[0]!.id.length).toBeGreaterThan(0);

    const dismissed = uiReducer(withToast, toastDismissed(withToast.toasts[0]!.id));
    expect(dismissed.toasts).toEqual([]);
  });
});
