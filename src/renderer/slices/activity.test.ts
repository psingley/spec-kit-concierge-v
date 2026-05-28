import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import { selectActivityCap, selectActivityEntries, selectActivityState } from './activity.selectors';
import activityReducer from './activity';

describe('activity slice', () => {
  it('initializes to the Run 4 locked state', () => {
    expect(activityReducer(undefined, { type: 'test/init' })).toEqual({
      entries: [],
      cap: 256,
      currentStatus: 'Idle',
      busy: false
    });
  });

  it('exposes base selectors through RootState', () => {
    const state = createProductStore().getState();

    expect(selectActivityState(state)).toBe(state.activity);
    expect(selectActivityEntries(state)).toBe(state.activity.entries);
    expect(selectActivityCap(state)).toBe(256);
  });
});
