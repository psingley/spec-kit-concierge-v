import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import {
  selectSessionActiveSessionId,
  selectSessionModeId,
  selectSessionModelId,
  selectSessionState
} from './session.selectors';
import sessionReducer from './session';

describe('session slice', () => {
  it('initializes to the Run 4 locked state', () => {
    expect(sessionReducer(undefined, { type: 'test/init' })).toEqual({
      activeSessionId: null,
      modelId: null,
      modeId: null,
      specifyPrompt: '',
      specifyRunning: false,
      specifyStarted: false,
      specMarkdown: '',
      artifactPath: null,
      commitSha: null,
      scrollProgress: 0,
      failureReason: null,
      clarifySessionId: null,
      clarifyRunning: false,
      clarifyAskAnotherRunning: false,
      clarifyCompleting: false,
      clarifyActiveQuestionId: null,
      clarifyQuestions: { ids: [], entities: {} },
      clarifyAnswers: { ids: [], entities: {} },
      clarifyReasks: { ids: [], entities: {} },
      clarifyCompletion: null,
      clarifyFailureReason: null
    });
  });

  it('exposes base selectors through RootState', () => {
    const state = createProductStore().getState();

    expect(selectSessionState(state)).toBe(state.session);
    expect(selectSessionActiveSessionId(state)).toBeNull();
    expect(selectSessionModelId(state)).toBeNull();
    expect(selectSessionModeId(state)).toBeNull();
  });
});
