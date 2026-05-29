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
import workspaceReducer from './workspace';

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
      maxReachedStep: 'specify'
    });
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
