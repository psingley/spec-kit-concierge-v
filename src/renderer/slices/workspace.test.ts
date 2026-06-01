import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import {
  selectSessionEntered,
  selectWorkspaceActiveRepoPath,
  selectWorkspaceAgents,
  selectWorkspaceAhead,
  selectWorkspaceBehind,
  selectWorkspaceBranch,
  selectWorkspaceDirty,
  selectWorkspaceState
} from './workspace.selectors';
import workspaceReducer, { branchUpdated, repositoryBrowseReset, repositorySelected, workspaceEntered, workspaceInitialState } from './workspace';

describe('workspace slice', () => {
  it('updates the branch when the target repo HEAD changes after a step', () => {
    const state = workspaceReducer({ ...workspaceInitialState, branch: 'main' }, branchUpdated({ branch: '014-remove-faux-controls' }));

    expect(state.branch).toBe('014-remove-faux-controls');
  });


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
      viewedStep: 'specify',
      sessionEntered: false
    });
  });

  it('sessionEntered is false after repositorySelected', () => {
    const state = workspaceReducer(
      workspaceInitialState,
      repositorySelected({ id: 'r1', name: 'repo', owner: 'org', path: '/work/repo', defaultBranch: 'main' })
    );
    expect(state.sessionEntered).toBe(false);
  });

  it('sessionEntered becomes true after workspaceEntered', () => {
    const state = workspaceReducer(
      workspaceInitialState,
      workspaceEntered({ repo: { id: 'r1', name: 'repo', owner: 'org', path: '/work/repo', defaultBranch: 'main' }, branch: null })
    );
    expect(state.sessionEntered).toBe(true);
  });

  it('sessionEntered resets to false after repositoryBrowseReset', () => {
    const entered = workspaceReducer(
      workspaceInitialState,
      workspaceEntered({ repo: { id: 'r1', name: 'repo', owner: 'org', path: '/work/repo', defaultBranch: 'main' }, branch: null })
    );
    const reset = workspaceReducer(entered, repositoryBrowseReset());
    expect(reset.sessionEntered).toBe(false);
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
    expect(selectSessionEntered(state)).toBe(false);
  });
});
