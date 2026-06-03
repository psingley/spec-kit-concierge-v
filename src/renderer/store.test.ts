import { describe, expect, it } from 'vitest';
import { api } from './api';
import { crossSliceSelectorPlaceholder } from './selectors/crossSlice.selectors';
import { createProductStore, type AppDispatch, type AppStore, type RootState } from './store';
import { useAppDispatch, useAppSelector, useAppStore } from './hooks/store';

describe('product store assembly', () => {
  it('exposes canonical initial state for all product slices and RTK Query', () => {
    const state = createProductStore().getState();

    expect(Object.keys(state).filter((key) => key !== api.reducerPath)).toEqual([
      'ui',
      'preferences',
      'auth',
      'workspace',
      'steps',
      'session',
      'activity',
      'copilot',
      'jira'
    ]);
    expect(state.ui).toMatchObject({ theme: 'system', sidebarOpen: true, activeView: null, showActivity: false, toasts: [] });
    expect(state.preferences).toMatchObject({ hydratedFromDisk: false, theme: 'system', accent: '#8b5cf6', activitySide: 'right' });
    expect(state.auth).toMatchObject({ copilotLoggedIn: null, githubLoggedIn: null, github: 'unknown', copilot: 'locked', atlassian: 'out' });
    expect(state.workspace).toEqual({
      activeRepoPath: null,
      agents: null,
      branch: null,
      ahead: 0,
      behind: 0,
      dirty: false,
      selectedRepo: null,
      sessions: [],
      activeStep: 'specify',
      maxReachedStep: 'specify',
      viewedStep: 'specify',
      sessionEntered: false
    });
    expect(state.steps).toEqual({ ids: [], entities: {} });
    expect(state.session).toMatchObject({ activeSessionId: null, modelId: null, modeId: null, specifyPrompt: '', specMarkdown: '' });
    expect(state.activity).toEqual({ entries: [], cap: 256, currentStatus: 'Idle', busy: false });
    expect(state.copilot).toEqual({ capabilities: null, lastProbeAt: null });
    expect(state.jira).toEqual({ submitting: false, dryRunPreview: null, results: [], issues: [], remaining: [], error: null, authState: { state: 'none' }, board: { source: 'none' } });
    expect(state).toHaveProperty(api.reducerPath);
  });

  it('supports typed store hooks from the sanctioned module', () => {
    const dispatchHook: typeof useAppDispatch = useAppDispatch;
    const selectorHook: typeof useAppSelector = useAppSelector;
    const storeHook: typeof useAppStore = useAppStore;
    const store = createProductStore();
    const dispatch: AppDispatch = store.dispatch;
    const appStore: AppStore = store;
    const rootState: RootState = store.getState();

    expect(dispatchHook).toBe(useAppDispatch);
    expect(selectorHook).toBe(useAppSelector);
    expect(storeHook).toBe(useAppStore);
    expect(dispatch).toBe(store.dispatch);
    expect(appStore.getState()).toEqual(rootState);
  });

  it('reserves the cross-slice selector module without domain derivation', () => {
    expect(crossSliceSelectorPlaceholder).toBe('run4-cross-slice-selectors-reserved');
  });
});
