import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import { selectCopilotCapabilities, selectCopilotLastProbeAt, selectCopilotState } from './copilot.selectors';
import copilotReducer from './copilot';

describe('copilot slice', () => {
  it('initializes to the Run 4 locked state', () => {
    expect(copilotReducer(undefined, { type: 'test/init' })).toEqual({
      capabilities: null,
      lastProbeAt: null
    });
  });

  it('exposes base selectors through RootState', () => {
    const state = createProductStore().getState();

    expect(selectCopilotState(state)).toBe(state.copilot);
    expect(selectCopilotCapabilities(state)).toBeNull();
    expect(selectCopilotLastProbeAt(state)).toBeNull();
  });
});
