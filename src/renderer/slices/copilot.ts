import { createSlice } from '@reduxjs/toolkit';
import type { RendererBoundCLICapabilities } from '../api/capabilities.factory';

export type CopilotState = {
  capabilities: RendererBoundCLICapabilities | null;
  lastProbeAt: string | null;
};

export const copilotInitialState: CopilotState = {
  capabilities: null,
  lastProbeAt: null
};

const copilotSlice = createSlice({
  name: 'copilot',
  initialState: copilotInitialState,
  reducers: {},
  extraReducers: () => {}
});

export const copilotReducer = copilotSlice.reducer;
export default copilotReducer;
