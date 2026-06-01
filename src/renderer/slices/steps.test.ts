import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import {
  selectAllSteps,
  selectStepById,
  selectStepEntities,
  selectStepIds,
  selectStepsState
} from './steps.selectors';
import stepsReducer, { stepsAdapter, stepsInitialState, stepsRestoredFromSession } from './steps';

describe('steps slice', () => {
  it('initializes from the entity adapter', () => {
    expect(stepsReducer(undefined, { type: 'test/init' })).toEqual(stepsAdapter.getInitialState());
  });

  it('restores per-step status from a resumed session', () => {
    const next = stepsReducer(
      stepsInitialState,
      stepsRestoredFromSession({
        states: { specify: 'complete', clarify: 'pending', plan: 'not_available', tasks: 'not_available', analyze: 'not_available', review: 'not_available' }
      })
    );

    expect(next.entities.specify?.status).toBe('complete');
    expect(next.entities.clarify?.status).toBe('pending');
    expect(next.entities.plan?.status).toBe('not_available');
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
