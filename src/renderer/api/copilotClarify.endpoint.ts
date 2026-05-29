import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererCopilotClarifyAck, parseRendererStepStreamEvent, type RendererCopilotClarifyAck } from './copilotClarify.factory';
import { activityBusyChanged, recordActivity } from '../slices/activity';
import { stepCompleted, stepPending } from '../slices/steps';
import {
  clarifyQuestionsReceived,
  clarifyRunFailed,
  clarifyRunStarted,
  clarifyRunSucceeded
} from '../slices/session';

export type ClarifyOperation = 'next' | 'askAnother' | 'reaskMalformed' | 'commit';

export type RunClarifyArgs = {
  repositoryPath: string;
  branch: string;
  operation: ClarifyOperation;
  modelId?: string | null;
  questionId?: string;
  answers?: Array<{ questionId: string; selectedChoiceKey: string; shortAnswer: string }>;
};

export const copilotClarifyApi = api.injectEndpoints({
  endpoints: (builder) => ({
    runClarify: builder.mutation<RendererCopilotClarifyAck, RunClarifyArgs>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const subscriptionId = `clarify-${Date.now().toString(36)}`;
        const unsubscribe = window.concierge.copilot!.subscribeStepStream('copilot:clarify', subscriptionId, (event) => {
          const parsed = parseRendererStepStreamEvent(event);
          if (!parsed.ok) {
            queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'error', message: parsed.error.message }));
            return;
          }
          if (parsed.value.type === 'progress') {
            queryApi.dispatch(activityBusyChanged({ busy: true, status: parsed.value.message }));
            queryApi.dispatch(recordActivity({ timestamp: parsed.value.timestamp, level: 'progress', message: parsed.value.message, step: 'clarify', sessionId: parsed.value.sessionId }));
            return;
          }
          if (parsed.value.status === 'pass') {
            const summary = parsed.value.summary;
            const questions = summary?.questions.map((question, index) => ({
              id: question.id,
              position: question.position ?? index + 1,
              text: question.text,
              choices: question.choices
            })) ?? [];
            const malformedQuestions = summary?.malformedQuestions?.map((question) => ({
              id: question.id,
              position: question.position,
              text: 'Malformed question',
              choices: [],
              malformed: true,
              malformationCategory: question.malformationCategory,
              rawOutput: question.rawOutput
            })) ?? [];
            if (questions.length > 0 || malformedQuestions.length > 0) {
              queryApi.dispatch(clarifyQuestionsReceived({ questions, malformedQuestions, replace: arg.operation === 'next' }));
            }
            if (typeof parsed.value.commitSha === 'string') {
              queryApi.dispatch(clarifyRunSucceeded({
                artifactPath: parsed.value.artifactPath ?? 'spec.md',
                commitSha: parsed.value.commitSha,
                questions: questions.map(({ id, text, position }) => ({ id, text, position })),
                answers: summary?.answers.map((answer) => ({
                  questionId: answer.questionId,
                  selectedChoiceKey: answer.choiceKey,
                  shortAnswer: answer.note ?? ''
                })) ?? []
              }));
              queryApi.dispatch(stepCompleted({ step: 'clarify', commitSha: parsed.value.commitSha, trailer: 'Concierge-Step: clarify:pass' }));
              queryApi.dispatch(activityBusyChanged({ busy: false, status: 'Clarify complete' }));
            } else {
              queryApi.dispatch(activityBusyChanged({ busy: false, status: 'Clarify ready' }));
            }
          } else {
            queryApi.dispatch(clarifyRunFailed({ reason: parsed.value.reason ?? 'Clarify failed' }));
            queryApi.dispatch(activityBusyChanged({ busy: false, status: 'Clarify failed' }));
          }
        });
        const response = await baseQuery({ channel: 'copilot:clarify', payload: { ...arg, subscriptionId, modelId: arg.modelId ?? undefined } });
        if (response.error !== undefined) {
          unsubscribe();
          return { error: response.error };
        }
        const parsed = parseRendererCopilotClarifyAck(response.data);
        if (!parsed.ok) {
          unsubscribe();
          return { error: parsingError(parsed.error) };
        }
        queryApi.dispatch(clarifyRunStarted({ sessionId: parsed.value.sessionId, mode: arg.operation, questionId: arg.questionId }));
        queryApi.dispatch(stepPending({ step: 'clarify', sessionId: parsed.value.sessionId }));
        setTimeout(unsubscribe, 60_000);
        return { data: parsed.value };
      },
      invalidatesTags: ['StepState', 'Step', 'Transcript']
    })
  })
});
