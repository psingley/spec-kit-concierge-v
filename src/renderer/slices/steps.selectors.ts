import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { stepsAdapter, type StepName, type StepState } from './steps';

const adapterSelectors = stepsAdapter.getSelectors<RootState>((state) => state.steps);

export const selectStepsState = (state: RootState) => state.steps;
export const selectStepIds = adapterSelectors.selectIds;
export const selectStepEntities = adapterSelectors.selectEntities;
export const selectAllSteps = adapterSelectors.selectAll;
export const selectStepById = (state: RootState, id: string) =>
  adapterSelectors.selectById(state, id as StepName);
export const selectStepStatus = createSelector(
  [selectStepEntities, (_state: RootState, step: StepName) => step],
  (entities, step): StepState => entities[step]?.status ?? 'not_available'
);
