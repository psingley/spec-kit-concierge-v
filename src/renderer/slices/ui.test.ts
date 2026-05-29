import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import { selectUiActiveView, selectUiSidebarOpen, selectUiState, selectUiTheme } from './ui.selectors';
import uiReducer from './ui';

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
      openMenu: null
    });
  });

  it('exposes base selectors through RootState', () => {
    const state = createProductStore().getState();

    expect(selectUiState(state)).toBe(state.ui);
    expect(selectUiTheme(state)).toBe('system');
    expect(selectUiSidebarOpen(state)).toBe(true);
    expect(selectUiActiveView(state)).toBeNull();
  });
});
