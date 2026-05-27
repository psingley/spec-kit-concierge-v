import { createEntityAdapter, createSlice, type EntityState } from '@reduxjs/toolkit';

export type StepStateRecord = {
  id: string;
  status: string;
  commitSha?: string;
  warnings: string[];
};

export const stepsAdapter = createEntityAdapter<StepStateRecord>();

export type StepsState = EntityState<StepStateRecord, string>;

export const stepsInitialState: StepsState = stepsAdapter.getInitialState();

const stepsSlice = createSlice({
  name: 'steps',
  initialState: stepsInitialState,
  reducers: {},
  extraReducers: () => {}
});

export const stepsReducer = stepsSlice.reducer;
export default stepsReducer;
