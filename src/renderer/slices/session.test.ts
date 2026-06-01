import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import {
  selectSessionActiveSessionId,
  selectSessionModeId,
  selectSessionModelId,
  selectSessionState
} from './session.selectors';
import sessionReducer, { sessionRestoredFromResume } from './session';

describe('session slice', () => {
  it('hydrates specMarkdown + commit on resume so Specify shows complete with evidence', () => {
    const state = sessionReducer(
      undefined,
      sessionRestoredFromResume({ specMarkdown: '# Spec\n\nbody', commitSha: 'abc1234' })
    );
    expect(state.specMarkdown).toBe('# Spec\n\nbody');
    expect(state.commitSha).toBe('abc1234');
    expect(state.specifyStarted).toBe(true);
  });

  it('resume hydration with an empty spec leaves Specify pending (no fake started flag)', () => {
    const state = sessionReducer(undefined, sessionRestoredFromResume({ specMarkdown: '', commitSha: null }));
    expect(state.specMarkdown).toBe('');
    expect(state.commitSha).toBeNull();
    expect(state.specifyStarted).toBe(false);
  });

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
      clarifyFailureReason: null,
      passiveSteps: {
        plan: { step: 'plan', sessionId: null, running: false, commitSha: null, failureReason: null, artifacts: [], milestones: [] },
        tasks: { step: 'tasks', sessionId: null, running: false, commitSha: null, failureReason: null, artifacts: [], milestones: [] },
        analyze: { step: 'analyze', sessionId: null, running: false, commitSha: null, failureReason: null, artifacts: [], milestones: [] }
      }
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
