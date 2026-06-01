import { describe, expect, it } from 'vitest';
import type { RootState } from '../store';
import sessionReducer, {
  clarifyAnswerChanged,
  clarifyNoQuestionsNeeded,
  clarifyQuestionsReceived,
  clarifyRunStarted,
  type SessionState
} from './session';
import { selectSessionCanFinishClarify, selectSessionClarifyNoQuestionsNeeded } from './session.selectors';

const asRoot = (session: SessionState): RootState => ({ session }) as unknown as RootState;

const oneQuestion = (): SessionState =>
  sessionReducer(
    undefined,
    clarifyQuestionsReceived({
      questions: [{ id: 'q1', position: 1, text: 'Q?', choices: [{ key: 'A', label: 'Alpha' }] }],
      replace: true
    })
  );

describe('selectSessionCanFinishClarify', () => {
  it('is true when no questions are needed and nothing is running', () => {
    const session = sessionReducer(undefined, clarifyNoQuestionsNeeded());
    expect(selectSessionCanFinishClarify(asRoot(session))).toBe(true);
    expect(selectSessionClarifyNoQuestionsNeeded(asRoot(session))).toBe(true);
  });

  it('is false while clarify is running even if no questions are needed', () => {
    const flagged = sessionReducer(undefined, clarifyNoQuestionsNeeded());
    const running = sessionReducer(flagged, clarifyRunStarted({ sessionId: 's1', mode: 'next' }));
    // clarifyRunStarted(next) resets the no-questions flag, so canFinish is false.
    expect(selectSessionCanFinishClarify(asRoot(running))).toBe(false);
  });

  it('is true when every visible question is answered', () => {
    const answered = sessionReducer(oneQuestion(), clarifyAnswerChanged({ questionId: 'q1', selectedChoiceKey: 'A' }));
    expect(selectSessionCanFinishClarify(asRoot(answered))).toBe(true);
  });

  it('is false when a visible question is unanswered', () => {
    expect(selectSessionCanFinishClarify(asRoot(oneQuestion()))).toBe(false);
  });

  it('is false when a question is malformed', () => {
    const malformed = sessionReducer(
      undefined,
      clarifyQuestionsReceived({
        questions: [],
        malformedQuestions: [{ id: 'm1', position: 1, text: 'Malformed question', choices: [], malformed: true }],
        replace: true
      })
    );
    expect(selectSessionCanFinishClarify(asRoot(malformed))).toBe(false);
  });
});
