import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import { selectAuthCopilotLoggedIn, selectAuthGithubLoggedIn, selectAuthState } from './auth.selectors';
import authReducer from './auth';

describe('auth slice', () => {
  it('initializes to the Run 4 locked state', () => {
    expect(authReducer(undefined, { type: 'test/init' })).toEqual({
      copilotLoggedIn: null,
      githubLoggedIn: null
    });
  });

  it('exposes base selectors through RootState', () => {
    const state = createProductStore().getState();

    expect(selectAuthState(state)).toBe(state.auth);
    expect(selectAuthCopilotLoggedIn(state)).toBeNull();
    expect(selectAuthGithubLoggedIn(state)).toBeNull();
  });
});
