import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import {
  parseRendererCopilotPassiveAck,
  parseRendererStepStreamEvent,
  type PassiveStepName,
  type RendererCopilotPassiveAck
} from './copilotPassive.factory';
import { acpStreamEventReceived, activityBusyChanged, recordActivity } from '../slices/activity';
import { stepCompleted, stepPending } from '../slices/steps';
import {
  passiveStepRunFailed,
  passiveStepRunProgressed,
  passiveStepRunStarted,
  passiveStepRunSucceeded
} from '../slices/session';
import { passiveStepCompletedInWorkspace } from '../slices/workspace';
import type { PassiveStepSummary } from './stepStreamEvent';

export type RunPassiveStepArgs = {
  step: PassiveStepName;
  repositoryPath: string;
  branch: string;
  modelId?: string | null;
};

const hasPassiveSummary = (summary: unknown): summary is PassiveStepSummary =>
  typeof summary === 'object' && summary !== null && Array.isArray((summary as { artifacts?: unknown }).artifacts);

const channelForStep = (step: PassiveStepName): 'copilot:plan' | 'copilot:tasks' | 'copilot:analyze' => `copilot:${step}`;

export const copilotPassiveApi = api.injectEndpoints({
  endpoints: (builder) => ({
    runPassiveStep: builder.mutation<RendererCopilotPassiveAck, RunPassiveStepArgs>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const subscriptionId = `${arg.step}-${Date.now().toString(36)}`;
        const channel = channelForStep(arg.step);
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
        const unsubscribe = window.concierge.copilot!.subscribeStepStream(channel, subscriptionId, (event) => {
          const parsed = parseRendererStepStreamEvent(event);
          if (!parsed.ok) {
            queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'error', message: parsed.error.message }));
            return;
          }
          if (parsed.value.type === 'progress') {
            queryApi.dispatch(passiveStepRunProgressed({ step: arg.step }));
            queryApi.dispatch(activityBusyChanged({ busy: true, status: parsed.value.message }));
            queryApi.dispatch(recordActivity({ timestamp: parsed.value.timestamp, level: 'progress', message: parsed.value.message, step: arg.step, sessionId: parsed.value.sessionId }));
            if (parsed.value.raw !== undefined) {
              queryApi.dispatch(acpStreamEventReceived({
                timestamp: parsed.value.timestamp,
                step: arg.step,
                sessionId: parsed.value.sessionId,
                message: parsed.value.message,
                raw: parsed.value.raw
              }));
            }
            return;
          }
          if (parsed.value.status === 'pass') {
            const summary = hasPassiveSummary(parsed.value.summary) ? parsed.value.summary : undefined;
            const commitSha = parsed.value.commitSha ?? '';
            queryApi.dispatch(passiveStepRunSucceeded({
              step: arg.step,
              commitSha,
              artifacts: summary?.artifacts ?? [],
              milestones: summary?.milestones
            }));
            queryApi.dispatch(passiveStepCompletedInWorkspace(arg.step));
            queryApi.dispatch(stepCompleted({ step: arg.step, commitSha, trailer: `Concierge-Step: ${arg.step}:pass` }));
            queryApi.dispatch(activityBusyChanged({ busy: false, status: `${arg.step} complete` }));
            teardown();
          } else {
            queryApi.dispatch(passiveStepRunFailed({ step: arg.step, reason: parsed.value.reason ?? `${arg.step} failed` }));
            queryApi.dispatch(activityBusyChanged({ busy: false, status: `${arg.step} failed` }));
            teardown();
          }
        });
        const response = await baseQuery({ channel, payload: { repositoryPath: arg.repositoryPath, branch: arg.branch, modelId: arg.modelId ?? undefined, subscriptionId } });
        if (response.error !== undefined) {
          teardown();
          return { error: response.error };
        }
        const parsed = parseRendererCopilotPassiveAck(response.data);
        if (!parsed.ok) {
          teardown();
          return { error: parsingError(parsed.error) };
        }
        queryApi.dispatch(passiveStepRunStarted({ step: arg.step, sessionId: parsed.value.sessionId, modelId: arg.modelId }));
        queryApi.dispatch(stepPending({ step: arg.step, sessionId: parsed.value.sessionId }));
        // Safety ceiling well above the longest real run (~370s); the listener is normally
        // torn down by the terminal done event above. Cleared inside teardown().
        guardTimer = setTimeout(teardown, 3_600_000);
        return { data: parsed.value };
      },
      invalidatesTags: ['StepState', 'Step', 'Transcript']
    })
  })
});
