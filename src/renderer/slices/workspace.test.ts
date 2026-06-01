import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import {
  selectWorkspaceActiveRepoPath,
  selectWorkspaceAgents,
  selectWorkspaceAhead,
  selectWorkspaceBehind,
  selectWorkspaceBranch,
  selectWorkspaceDirty,
  selectWorkspaceState
} from './workspace.selectors';
import workspaceReducer, { workspaceEntered, workspaceInitialState } from './workspace';

describe('workspace slice', () => {
  it('initializes to the Run 4 locked state', () => {
    expect(workspaceReducer(undefined, { type: 'test/init' })).toEqual({
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
      viewedStep: 'specify'
    });
  });

  it('restores the branch and reached step from a resumed session instead of a fresh specify', () => {
    const next = workspaceReducer(
      workspaceInitialState,
      workspaceEntered({
        repo: { id: 'r1', name: 'concierge-api', owner: 'collette-travel', path: '/work/concierge-api', defaultBranch: 'main' },
        branch: 'spec/runtime-session',
        restoredStates: { specify: 'complete', clarify: 'pending', plan: 'not_available', tasks: 'not_available', analyze: 'not_available', review: 'not_available' }
      })
    );

    expect(next.branch).toBe('spec/runtime-session');
    expect(next.maxReachedStep).toBe('clarify');
  });

  it('exposes base selectors through RootState', () => {
    const state = createProductStore().getState();

    expect(selectWorkspaceState(state)).toBe(state.workspace);
    expect(selectWorkspaceActiveRepoPath(state)).toBeNull();
    expect(selectWorkspaceAgents(state)).toBeNull();
    expect(selectWorkspaceBranch(state)).toBeNull();
    expect(selectWorkspaceAhead(state)).toBe(0);
    expect(selectWorkspaceBehind(state)).toBe(0);
    expect(selectWorkspaceDirty(state)).toBe(false);
  });
});
