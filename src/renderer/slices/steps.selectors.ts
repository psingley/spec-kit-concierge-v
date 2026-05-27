import type { EntityId } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { stepsAdapter } from './steps';

const adapterSelectors = stepsAdapter.getSelectors<RootState>((state) => state.steps);

export const selectStepsState = (state: RootState) => state.steps;
export const selectStepIds = adapterSelectors.selectIds as (state: RootState) => EntityId[];
export const selectStepEntities = adapterSelectors.selectEntities;
export const selectAllSteps = adapterSelectors.selectAll;
export const selectStepById = adapterSelectors.selectById;
