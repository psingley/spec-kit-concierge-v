import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import {
  selectAllSteps,
  selectStepById,
  selectStepEntities,
  selectStepIds,
  selectStepsState
} from './steps.selectors';
import stepsReducer, { stepsAdapter } from './steps';

describe('steps slice', () => {
  it('initializes from the entity adapter', () => {
    expect(stepsReducer(undefined, { type: 'test/init' })).toEqual(stepsAdapter.getInitialState());
  });

  it('exposes adapter-backed selectors through RootState', () => {
    const state = createProductStore().getState();

    expect(selectStepsState(state)).toBe(state.steps);
    expect(selectStepIds(state)).toEqual([]);
    expect(selectStepEntities(state)).toEqual({});
    expect(selectAllSteps(state)).toEqual([]);
    expect(selectStepById(state, 'missing')).toBeUndefined();
  });
});
