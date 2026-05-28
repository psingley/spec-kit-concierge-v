import { describe, expect, test } from 'vitest';
import { createInitialDevSessionState, markCaptureFailure, markCaptureSuccess, shouldRestartElectron } from './session';

describe('dev session state machine', () => {
  test('starts cold and becomes warm after design and shipped captures succeed', () => {
    let state = createInitialDevSessionState();
    expect(state.phase).toBe('cold');
    state = markCaptureSuccess(state, 'design');
    expect(state.phase).toBe('design-ready');
    state = markCaptureSuccess(state, 'shipped');
    expect(state.phase).toBe('warm');
  });

  test('requests electron restart after a shipped capture timeout', () => {
    const state = markCaptureFailure(createInitialDevSessionState(), 'shipped', new Error('capture timed out after 90000ms'));
    expect(shouldRestartElectron(state)).toBe(true);
    expect(state.lastFailure?.step).toBe('shipped');
  });
});
