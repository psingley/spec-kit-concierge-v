import React from 'react';
import { copilotClarifyApi } from '../api/copilotClarify.endpoint';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectPreferencesSelectedCopilotModel } from '../slices/preferences.selectors';
import { clarifyActiveQuestionChanged, clarifyAnswerChanged } from '../slices/session';
import {
  selectSessionCanFinishClarify,
  selectSessionClarifyActiveQuestionId,
  selectSessionClarifyAnswers,
  selectSessionClarifyAskAnotherRunning,
  selectSessionClarifyCompleting,
  selectSessionClarifyNoQuestionsNeeded,
  selectSessionClarifyCompletion,
  selectSessionClarifyFailureReason,
  selectSessionClarifyQuestions,
  selectSessionClarifyRunning
} from '../slices/session.selectors';
import { selectWorkspaceBranch, selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { ClarifyStep } from './ClarifyStep';

export const ClarifyStepContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const branch = useAppSelector(selectWorkspaceBranch);
  const modelId = useAppSelector(selectPreferencesSelectedCopilotModel);
  const questions = useAppSelector(selectSessionClarifyQuestions);
  const answers = useAppSelector(selectSessionClarifyAnswers);
  const [runClarify] = copilotClarifyApi.useRunClarifyMutation();
  const run = (operation: 'next' | 'askAnother' | 'reaskMalformed' | 'commit', questionId?: string): void => {
    if (repo === null || branch === null) {
      return;
    }
    void runClarify({
      repositoryPath: repo.path,
      branch,
      operation,
      questionId,
      modelId,
      answers: Object.values(answers)
        .filter((answer): answer is NonNullable<typeof answer> => answer !== undefined)
        .map((answer) => ({
          questionId: answer.questionId,
          selectedChoiceKey: answer.selectedChoiceKey,
          shortAnswer: answer.shortAnswer
        }))
    });
  };

  return (
    <ClarifyStep
      questions={questions}
      answers={answers}
      activeQuestionId={useAppSelector(selectSessionClarifyActiveQuestionId)}
      running={useAppSelector(selectSessionClarifyRunning)}
      askAnotherRunning={useAppSelector(selectSessionClarifyAskAnotherRunning)}
      completing={useAppSelector(selectSessionClarifyCompleting)}
      noQuestionsNeeded={useAppSelector(selectSessionClarifyNoQuestionsNeeded)}
      canFinish={useAppSelector(selectSessionCanFinishClarify)}
      completion={useAppSelector(selectSessionClarifyCompletion)}
      failureReason={useAppSelector(selectSessionClarifyFailureReason)}
      onStart={() => run('next')}
      onAskAnother={() => run('askAnother')}
      onReask={(questionId) => run('reaskMalformed', questionId)}
      onFinish={() => run('commit')}
      onActiveQuestionChange={(questionId) => dispatch(clarifyActiveQuestionChanged({ questionId }))}
      onAnswerChange={(questionId, answer) => dispatch(clarifyAnswerChanged({ questionId, ...answer }))}
    />
  );
};
