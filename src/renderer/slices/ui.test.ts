import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import {
  selectUiActiveView,
  selectUiArtifactViewerOrigin,
  selectUiArtifactViewerPath,
  selectUiShowArtifactViewer,
  selectUiSidebarOpen,
  selectUiState,
  selectUiTheme,
  selectUiToasts
} from './ui.selectors';
import uiReducer, { artifactViewerClosed, artifactViewerOpened, modalClosed, toastDismissed, toastShown } from './ui';

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
      showArtifactViewer: false,
      artifactViewerPath: null,
      artifactViewerOrigin: null,
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
    expect(selectUiShowArtifactViewer(state)).toBe(false);
    expect(selectUiArtifactViewerPath(state)).toBeNull();
    expect(selectUiArtifactViewerOrigin(state)).toBeNull();
    expect(selectUiToasts(state)).toEqual([]);
  });

  it('opens and closes shared artifact viewer state with path and origin', () => {
    const opened = uiReducer(undefined, artifactViewerOpened({ path: 'plan.md', origin: 'passive' }));

    expect(opened.showArtifactViewer).toBe(true);
    expect(opened.artifactViewerPath).toBe('plan.md');
    expect(opened.artifactViewerOrigin).toBe('passive');

    const closed = uiReducer(opened, artifactViewerClosed());
    expect(closed.showArtifactViewer).toBe(false);
    expect(closed.artifactViewerPath).toBeNull();
    expect(closed.artifactViewerOrigin).toBeNull();
  });

  it('clears artifact viewer metadata through the shared modalClosed action', () => {
    const opened = uiReducer(undefined, artifactViewerOpened({ path: 'tasks.md', origin: 'review' }));
    const closed = uiReducer(opened, modalClosed('showArtifactViewer'));

    expect(closed.showArtifactViewer).toBe(false);
    expect(closed.artifactViewerPath).toBeNull();
    expect(closed.artifactViewerOrigin).toBeNull();
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
