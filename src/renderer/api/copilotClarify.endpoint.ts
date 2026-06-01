import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererCopilotClarifyAck, parseRendererStepStreamEvent, type RendererCopilotClarifyAck } from './copilotClarify.factory';
import { activityBusyChanged, recordActivity } from '../slices/activity';
import { clarifyQuestionMalformed, stepCompleted, stepPending } from '../slices/steps';
import {
  clarifyQuestionsReceived,
  clarifyRunFailed,
  clarifyRunStarted,
  clarifyRunSucceeded
} from '../slices/session';
import type { ClarifySummary } from './stepStreamEvent';

export type ClarifyOperation = 'next' | 'askAnother' | 'reaskMalformed' | 'commit';

export type RunClarifyArgs = {
  repositoryPath: string;
  branch: string;
  operation: ClarifyOperation;
  modelId?: string | null;
  questionId?: string;
  answers?: Array<{ questionId: string; selectedChoiceKey: string; shortAnswer: string }>;
};

const hasClarifySummary = (summary: unknown): summary is ClarifySummary =>
  typeof summary === 'object' &&
  summary !== null &&
  Array.isArray((summary as { questions?: unknown }).questions) &&
  Array.isArray((summary as { answers?: unknown }).answers);

export const copilotClarifyApi = api.injectEndpoints({
  endpoints: (builder) => ({
    runClarify: builder.mutation<RendererCopilotClarifyAck, RunClarifyArgs>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const subscriptionId = `clarify-${Date.now().toString(36)}`;
        let unsubscribed = false;
        let guardTimer: ReturnType<typeof setTimeout> | undefined;
        const teardown = () => {
          if (unsubscribed) {
            return;
          }
          unsubscribed = true;
          if (guardTimer !== undefined) {
            clearTimeout(guardTimer);
            guardTimer = undefined;
          }
          unsubscribe();
        };
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
            const summary = hasClarifySummary(parsed.value.summary) ? parsed.value.summary : undefined;
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
              for (const malformedQuestion of malformedQuestions) {
                queryApi.dispatch(clarifyQuestionMalformed({
                  questionId: malformedQuestion.id,
                  malformationCategory: malformedQuestion.malformationCategory ?? 'unknown',
                  rawOutput: malformedQuestion.rawOutput ?? '',
                  timestamp: new Date().toISOString(),
                  modelId: arg.modelId ?? 'unknown',
                  sessionId: parsed.value.sessionId
                }));
              }
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
              // Genuine terminal: clarify committed. Questions-only "Clarify ready" passes
              // (no commitSha) are intermediate and intentionally keep the listener alive.
              teardown();
            } else {
              queryApi.dispatch(activityBusyChanged({ busy: false, status: 'Clarify ready' }));
            }
          } else {
            queryApi.dispatch(clarifyRunFailed({ reason: parsed.value.reason ?? 'Clarify failed' }));
            queryApi.dispatch(activityBusyChanged({ busy: false, status: 'Clarify failed' }));
            teardown();
          }
        });
        const response = await baseQuery({ channel: 'copilot:clarify', payload: { ...arg, subscriptionId, modelId: arg.modelId ?? undefined } });
        if (response.error !== undefined) {
          teardown();
          return { error: response.error };
        }
        const parsed = parseRendererCopilotClarifyAck(response.data);
        if (!parsed.ok) {
          teardown();
          return { error: parsingError(parsed.error) };
        }
        queryApi.dispatch(clarifyRunStarted({ sessionId: parsed.value.sessionId, mode: arg.operation, questionId: arg.questionId }));
        queryApi.dispatch(stepPending({ step: 'clarify', sessionId: parsed.value.sessionId }));
        // Safety ceiling well above the longest real run (~370s); the listener is normally
        // torn down by the genuine terminal (commit or fail) above. Cleared inside teardown().
        guardTimer = setTimeout(teardown, 3_600_000);
        return { data: parsed.value };
      },
      invalidatesTags: ['StepState', 'Step', 'Transcript']
    })
  })
});
