import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererCopilotSpecifyAck, parseRendererStepStreamEvent, type RendererCopilotSpecifyAck } from './copilotSpecify.factory';
import { activityBusyChanged, recordActivity } from '../slices/activity';
import { specifyCompletedInWorkspace } from '../slices/workspace';
import { stepCompleted, stepPending } from '../slices/steps';
import { specifyRunFailed, specifyRunProgressed, specifyRunStarted, specifyRunSucceeded } from '../slices/session';
import { toastShown } from '../slices/ui';

export type RunSpecifyArgs = {
  repositoryPath: string;
  branch: string;
  prompt: string;
  modelId?: string | null;
};

export const copilotSpecifyApi = api.injectEndpoints({
  endpoints: (builder) => ({
    runSpecify: builder.mutation<RendererCopilotSpecifyAck, RunSpecifyArgs>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const subscriptionId = `sub-${Date.now().toString(36)}`;
        const unsubscribe = window.concierge.copilot!.subscribeSpecify(subscriptionId, (event) => {
          const parsed = parseRendererStepStreamEvent(event);
          if (!parsed.ok) {
            queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'error', message: parsed.error.message }));
            return;
          }
          if (parsed.value.type === 'progress') {
            queryApi.dispatch(specifyRunProgressed());
            queryApi.dispatch(activityBusyChanged({ busy: true, status: parsed.value.message }));
            queryApi.dispatch(recordActivity({ timestamp: parsed.value.timestamp, level: 'progress', message: parsed.value.message, step: 'specify', sessionId: parsed.value.sessionId }));
          } else if (parsed.value.status === 'pass') {
            queryApi.dispatch(specifyRunSucceeded({ specMarkdown: parsed.value.specMarkdown ?? '', artifactPath: parsed.value.artifactPath ?? 'specs/0006-specify-vertical/spec.md', commitSha: parsed.value.commitSha ?? '' }));
            queryApi.dispatch(stepCompleted({ step: 'specify', commitSha: parsed.value.commitSha ?? '', trailer: 'Concierge-Step: specify:pass' }));
            queryApi.dispatch(stepPending({ step: 'clarify', sessionId: parsed.value.sessionId }));
            queryApi.dispatch(specifyCompletedInWorkspace());
            queryApi.dispatch(activityBusyChanged({ busy: false, status: 'Specify complete' }));
          } else {
            queryApi.dispatch(specifyRunFailed({ reason: parsed.value.reason ?? 'Specify failed' }));
            queryApi.dispatch(activityBusyChanged({ busy: false, status: 'Specify failed' }));
          }
        });
        const response = await baseQuery({ channel: 'copilot:specify', payload: { ...arg, subscriptionId, modelId: arg.modelId ?? undefined } });
        if (response.error !== undefined) {
          unsubscribe();
          const msg = response.error.data?.message ?? 'Specify IPC call failed';
          console.error('[copilot:specify]', msg, response.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Specify failed: ${msg}` }));
          return { error: response.error };
        }
        const parsed = parseRendererCopilotSpecifyAck(response.data);
        if (!parsed.ok) {
          unsubscribe();
          console.error('[copilot:specify] ack parse failed', parsed.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Specify failed: ${parsed.error.message}` }));
          return { error: parsingError(parsed.error) };
        }
        queryApi.dispatch(specifyRunStarted({ sessionId: parsed.value.sessionId, modelId: arg.modelId }));
        queryApi.dispatch(stepPending({ step: 'specify', sessionId: parsed.value.sessionId }));
        setTimeout(unsubscribe, 60_000);
        return { data: parsed.value };
      },
      invalidatesTags: ['StepState', 'Step', 'Transcript']
    })
  })
});
