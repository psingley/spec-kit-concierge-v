import type { RootState } from '../store';

export const selectCopilotState = (state: RootState) => state.copilot;
export const selectCopilotCapabilities = (state: RootState) => state.copilot.capabilities;
export const selectCopilotLastProbeAt = (state: RootState) => state.copilot.lastProbeAt;
