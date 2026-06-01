import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import {
  selectSessionActiveSessionId,
  selectSessionModeId,
  selectSessionModelId,
  selectSessionState
} from './session.selectors';
import sessionReducer, {
  clarifyNoQuestionsNeeded,
  clarifyQuestionsReceived,
  clarifyRunStarted,
  sessionRestoredFromResume
} from './session';

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
      clarifyNoQuestionsNeeded: false,
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

  it('clarifyNoQuestionsNeeded clears running flags and sets the flag', () => {
    const running = sessionReducer(undefined, clarifyRunStarted({ sessionId: 's1', mode: 'next' }));
    expect(running.clarifyRunning).toBe(true);

    const state = sessionReducer(running, clarifyNoQuestionsNeeded());
    expect(state.clarifyRunning).toBe(false);
    expect(state.clarifyAskAnotherRunning).toBe(false);
    expect(state.clarifyCompleting).toBe(false);
    expect(state.clarifyNoQuestionsNeeded).toBe(true);
  });

  it('clarifyRunStarted (next) resets clarifyNoQuestionsNeeded to false', () => {
    const flagged = sessionReducer(undefined, clarifyNoQuestionsNeeded());
    expect(flagged.clarifyNoQuestionsNeeded).toBe(true);

    const state = sessionReducer(flagged, clarifyRunStarted({ sessionId: 's1', mode: 'next' }));
    expect(state.clarifyNoQuestionsNeeded).toBe(false);
  });

  it('clarifyQuestionsReceived resets clarifyNoQuestionsNeeded to false', () => {
    const flagged = sessionReducer(undefined, clarifyNoQuestionsNeeded());
    const state = sessionReducer(
      flagged,
      clarifyQuestionsReceived({
        questions: [{ id: 'q1', position: 1, text: 'Q?', choices: [{ key: 'A', label: 'Alpha' }] }],
        replace: true
      })
    );
    expect(state.clarifyNoQuestionsNeeded).toBe(false);
  });

  it('exposes base selectors through RootState', () => {
    const state = createProductStore().getState();

    expect(selectSessionState(state)).toBe(state.session);
    expect(selectSessionActiveSessionId(state)).toBeNull();
    expect(selectSessionModelId(state)).toBeNull();
    expect(selectSessionModeId(state)).toBeNull();
  });
});
