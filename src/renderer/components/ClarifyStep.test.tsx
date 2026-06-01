import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClarifyStep } from './ClarifyStep';
import type { ClarifyCompletionSummary, ClarifyQuestionRecord } from '../slices/session';

const twoQuestions: ClarifyQuestionRecord[] = [
  { id: 'q1', position: 1, text: 'First?', choices: [{ key: 'A', label: 'Alpha' }, { key: 'B', label: 'Beta' }] },
  { id: 'q2', position: 2, text: 'Second?', choices: [{ key: 'A', label: 'Gamma' }, { key: 'B', label: 'Delta' }] }
];

const renderStep = (
  overrides: Partial<React.ComponentProps<typeof ClarifyStep>> = {}
) => {
  const onActiveQuestionChange = vi.fn();
  const onAnswerChange = vi.fn();
  render(
    <ClarifyStep
      questions={twoQuestions}
      answers={{}}
      activeQuestionId="q1"
      running={false}
      askAnotherRunning={false}
      completing={false}
      noQuestionsNeeded={false}
      canFinish={false}
      completion={null}
      failureReason={null}
      onStart={vi.fn()}
      onAskAnother={vi.fn()}
      onReask={vi.fn()}
      onFinish={vi.fn()}
      onActiveQuestionChange={onActiveQuestionChange}
      onAnswerChange={onAnswerChange}
      {...overrides}
    />
  );
  return { onActiveQuestionChange, onAnswerChange };
};

describe('ClarifyStep auto-advance on answer select', () => {
  it('advances the active question to the next when a choice is selected on a non-last question', () => {
    const { onActiveQuestionChange, onAnswerChange } = renderStep({ activeQuestionId: 'q1' });

    fireEvent.click(screen.getByDisplayValue('A'));

    expect(onAnswerChange).toHaveBeenCalledWith('q1', { selectedChoiceKey: 'A' });
    expect(onActiveQuestionChange).toHaveBeenCalledWith('q2');
  });

  it('does NOT advance when a choice is selected on the last question', () => {
    const { onActiveQuestionChange, onAnswerChange } = renderStep({ activeQuestionId: 'q2' });

    fireEvent.click(screen.getByDisplayValue('A'));

    expect(onAnswerChange).toHaveBeenCalledWith('q2', { selectedChoiceKey: 'A' });
    expect(onActiveQuestionChange).not.toHaveBeenCalled();
  });

  it('does NOT advance when the user types a free-text short answer (Other path)', () => {
    const { onActiveQuestionChange, onAnswerChange } = renderStep({ activeQuestionId: 'q1' });

    fireEvent.change(screen.getByLabelText(/clarification note/i), { target: { value: 'custom' } });

    expect(onAnswerChange).toHaveBeenCalledWith('q1', { shortAnswer: 'custom' });
    expect(onActiveQuestionChange).not.toHaveBeenCalled();
  });
});

describe('ClarifyStep completion done-view (regression: re-Finish loop after commit)', () => {
  const completion: ClarifyCompletionSummary = {
    artifactPath: 'spec.md',
    commitSha: 'abcdef1234567890',
    questions: [{ id: 'q1', text: 'First?', position: 1 }],
    answers: [{ questionId: 'q1', selectedChoiceKey: 'A', shortAnswer: '' }]
  };

  it('renders the Clarify complete done-view with the committed evidence when completion is set', () => {
    renderStep({ completion });

    expect(screen.getByRole('heading', { name: /clarify complete/i })).toBeTruthy();
    // Short-form commit sha evidence.
    expect(screen.getByText(/abcdef1/)).toBeTruthy();
  });

  it('hides the Finish button and the question fieldset when completion is set', () => {
    renderStep({ completion, canFinish: true });

    expect(screen.queryByRole('button', { name: /finish/i })).toBeNull();
    // No answer fieldset/radio in the done state.
    expect(screen.queryByDisplayValue('A')).toBeNull();
    expect(screen.queryByRole('group', { name: /choose one answer/i })).toBeNull();
  });

  it('still renders the question form (with Finish) when completion is null and questions are present', () => {
    renderStep({ completion: null, activeQuestionId: 'q1' });

    expect(screen.queryByText(/clarify complete/i)).toBeNull();
    expect(screen.getByDisplayValue('A')).toBeTruthy();
    expect(screen.getByRole('button', { name: /finish/i })).toBeTruthy();
  });
});

describe('ClarifyStep no-clarifications-needed terminal state', () => {
  it('renders the no-clarifications message and an enabled Finish, not the spinner', () => {
    renderStep({ questions: [], activeQuestionId: null, noQuestionsNeeded: true, canFinish: true });

    expect(screen.getByText(/the spec is already clear/i)).toBeTruthy();
    expect(screen.queryByText('Clarifying...')).toBeNull();
    const finish = screen.getByRole('button', { name: /finish/i });
    expect((finish as HTMLButtonElement).disabled).toBe(false);
  });
});
