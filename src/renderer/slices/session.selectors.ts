import type { RootState } from '../store';
import type { ClarifyQuestionRecord, PassiveStepName } from './session';

export const selectSessionState = (state: RootState) => state.session;
export const selectSessionActiveSessionId = (state: RootState) => state.session.activeSessionId;
export const selectSessionModelId = (state: RootState) => state.session.modelId;
export const selectSessionModeId = (state: RootState) => state.session.modeId;
export const selectSessionSpecifyPrompt = (state: RootState) => state.session.specifyPrompt;
export const selectSessionSpecifyRunning = (state: RootState) => state.session.specifyRunning;
export const selectSessionAnyStepRunning = (state: RootState): boolean =>
  state.session.specifyRunning ||
  state.session.clarifyRunning ||
  state.session.clarifyAskAnotherRunning ||
  state.session.clarifyCompleting ||
  Object.values(state.session.passiveSteps).some((step) => step.running);
export const selectSessionSpecifyStarted = (state: RootState) => state.session.specifyStarted;
export const selectSessionSpecMarkdown = (state: RootState) => state.session.specMarkdown;
export const selectSessionArtifactPath = (state: RootState) => state.session.artifactPath;
export const selectSessionCommitSha = (state: RootState) => state.session.commitSha;
export const selectSessionScrollProgress = (state: RootState) => state.session.scrollProgress;
export const selectSessionFailureReason = (state: RootState) => state.session.failureReason;
export const selectSessionCanBeginSpecify = (state: RootState) =>
  state.session.specifyPrompt.trim().length > 0 && !state.session.specifyRunning;
export const selectSessionClarifyQuestions = (state: RootState): ClarifyQuestionRecord[] =>
  state.session.clarifyQuestions.ids
    .map((id) => state.session.clarifyQuestions.entities[id])
    .filter((question): question is ClarifyQuestionRecord => question !== undefined)
    .sort((a, b) => a.position - b.position);
export const selectSessionClarifyAnswers = (state: RootState) => state.session.clarifyAnswers.entities;
export const selectSessionClarifyActiveQuestionId = (state: RootState) => state.session.clarifyActiveQuestionId;
export const selectSessionClarifyRunning = (state: RootState) => state.session.clarifyRunning;
export const selectSessionClarifyAskAnotherRunning = (state: RootState) => state.session.clarifyAskAnotherRunning;
export const selectSessionClarifyCompleting = (state: RootState) => state.session.clarifyCompleting;
export const selectSessionClarifyNoQuestionsNeeded = (state: RootState) => state.session.clarifyNoQuestionsNeeded;
export const selectSessionClarifyCompletion = (state: RootState) => state.session.clarifyCompletion;
export const selectSessionClarifyFailureReason = (state: RootState) => state.session.clarifyFailureReason;
export const selectSessionPassiveStep = (step: PassiveStepName) => (state: RootState) => state.session.passiveSteps[step];
export const selectSessionPassiveSteps = (state: RootState) => state.session.passiveSteps;
export const selectSessionCanFinishClarify = (state: RootState): boolean => {
  const questions = selectSessionClarifyQuestions(state);
  const hasMalformed = questions.some((question) => question.malformed === true);
  const allAnswered = questions
    .filter((question) => question.malformed !== true)
    .every((question) => (state.session.clarifyAnswers.entities[question.id]?.selectedChoiceKey ?? '').length > 0);
  const answerable = questions.length > 0 && allAnswered && !hasMalformed;
  return (state.session.clarifyNoQuestionsNeeded || answerable)
    && !state.session.clarifyRunning
    && !state.session.clarifyAskAnotherRunning
    && !state.session.clarifyCompleting;
};
