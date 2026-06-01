import React from 'react';
import { Ico } from './Icons';
import type { ClarifyAnswerRecord, ClarifyCompletionSummary, ClarifyQuestionRecord } from '../slices/session';

export type ClarifyStepProps = {
  questions: ClarifyQuestionRecord[];
  answers: Record<string, ClarifyAnswerRecord | undefined>;
  activeQuestionId: string | null;
  running: boolean;
  askAnotherRunning: boolean;
  completing: boolean;
  canFinish: boolean;
  completion: ClarifyCompletionSummary | null;
  failureReason: string | null;
  onStart: () => void;
  onAskAnother: () => void;
  onReask: (questionId: string) => void;
  onFinish: () => void;
  onActiveQuestionChange: (questionId: string) => void;
  onAnswerChange: (questionId: string, answer: { selectedChoiceKey?: string; shortAnswer?: string }) => void;
};

export const ClarifyStep = ({
  questions,
  answers,
  activeQuestionId,
  running,
  askAnotherRunning,
  completing,
  canFinish,
  completion,
  failureReason,
  onStart,
  onAskAnother,
  onReask,
  onFinish,
  onActiveQuestionChange,
  onAnswerChange
}: ClarifyStepProps): React.ReactElement => {
  const activeQuestion = questions.find((question) => question.id === activeQuestionId) ?? questions[0] ?? null;
  const inFlight = running || askAnotherRunning || completing;

  // Selecting a concrete multiple-choice answer auto-advances to the next question.
  // A radio onChange always carries a multiple-choice key (the free-text "Other"/short
  // answer is the textarea, not a radio), so any choice select on a non-last question
  // should advance. The last question never advances.
  const selectChoice = (questionId: string, choiceKey: string): void => {
    onAnswerChange(questionId, { selectedChoiceKey: choiceKey });
    const index = questions.findIndex((question) => question.id === questionId);
    const next = index >= 0 ? questions[index + 1] : undefined;
    if (next !== undefined) {
      onActiveQuestionChange(next.id);
    }
  };

  return (
    <section className="clarify-step" aria-labelledby="clarify-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step 2</p>
          <h2 id="clarify-heading">Clarify</h2>
        </div>
        <div className="segmented" role="group" aria-label="Clarify actions">
          <button type="button" onClick={onStart} disabled={inFlight}><Ico.Sparkles size={13} />Run</button>
          <button type="button" onClick={onAskAnother} disabled={inFlight || questions.length === 0}><Ico.Plus size={13} />Ask another</button>
        </div>
      </div>

      <div className="clarify-shell">
        <div className="clarify-list" role="tablist" aria-label="Clarification questions">
          {questions.map((question) => (
            <button
              key={question.id}
              type="button"
              role="tab"
              aria-selected={activeQuestion?.id === question.id}
              className={`clarify-pip ${activeQuestion?.id === question.id ? 'is-active' : ''} ${question.malformed === true ? 'is-malformed' : ''}`}
              onClick={() => onActiveQuestionChange(question.id)}
            >
              {question.position}
            </button>
          ))}
        </div>

        {running ? (
          <div className="clarify-card" role="status" aria-live="polite">
            <div className="spinner" data-vd-role="spinner" />
            <strong>Clarifying...</strong>
          </div>
        ) : activeQuestion === null ? (
          <div className="clarify-card empty">
            <p>Clarify is ready after Specify completes.</p>
            <button type="button" className="btn primary" onClick={onStart} disabled={inFlight}>Run Clarify</button>
          </div>
        ) : activeQuestion.malformed === true ? (
          <div className="clarify-card malformed" aria-live="polite">
            <p className="eyebrow">Malformed question {activeQuestion.position}</p>
            <h3>{activeQuestion.malformationCategory ?? 'Invalid question'}</h3>
            <pre>{activeQuestion.rawOutput}</pre>
            <button type="button" className="btn primary" onClick={() => onReask(activeQuestion.id)} disabled={inFlight}>
              Rewrite question
            </button>
          </div>
        ) : (
          <div className="clarify-card">
            <p className="eyebrow">Question {activeQuestion.position}</p>
            <h3>{activeQuestion.text}</h3>
            <fieldset className="clarify-choices">
              <legend>Choose one answer</legend>
              {activeQuestion.choices.map((choice) => (
                <label key={choice.key} className="choice-row">
                  <input
                    type="radio"
                    name={activeQuestion.id}
                    value={choice.key}
                    checked={answers[activeQuestion.id]?.selectedChoiceKey === choice.key}
                    onChange={() => selectChoice(activeQuestion.id, choice.key)}
                  />
                  <span>{choice.key}. {choice.label}</span>
                </label>
              ))}
            </fieldset>
            <textarea
              className="clarify-note"
              aria-label="Optional clarification note"
              value={answers[activeQuestion.id]?.shortAnswer ?? ''}
              onChange={(event) => onAnswerChange(activeQuestion.id, { shortAnswer: event.target.value })}
            />
          </div>
        )}

        <div className="advance-row">
          <span role="status" aria-live="polite">
            {askAnotherRunning ? 'Asking another question...' : completing ? 'Finishing Clarify...' : canFinish ? 'Ready to finish.' : 'Answer every visible question to finish.'}
          </span>
          <button type="button" className="btn primary" disabled={!canFinish} onClick={onFinish}>Finish <Ico.Right size={13} /></button>
        </div>
      </div>

      {completion !== null ? <p role="status">Clarify pass: {completion.artifactPath} at {completion.commitSha}</p> : null}
      {failureReason !== null ? <p role="alert">{failureReason}</p> : null}
    </section>
  );
};
