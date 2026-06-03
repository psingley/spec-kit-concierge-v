import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererCopilotSpecifyAck, parseRendererStepStreamEvent, type RendererCopilotSpecifyAck } from './copilotSpecify.factory';
import { activityBusyChanged, assistantTextReceived, recordActivity } from '../slices/activity';
import { branchUpdated, specifyCompletedInWorkspace } from '../slices/workspace';
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
        const unsubscribe = window.concierge.copilot!.subscribeSpecify(subscriptionId, (event) => {
          const parsed = parseRendererStepStreamEvent(event);
          if (!parsed.ok) {
            queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'error', message: parsed.error.message }));
            return;
          }
          if (parsed.value.type === 'progress') {
            queryApi.dispatch(specifyRunProgressed());
            queryApi.dispatch(activityBusyChanged({ busy: true, status: parsed.value.message }));
            if (parsed.value.kind === 'assistant-text') {
              queryApi.dispatch(assistantTextReceived({
                timestamp: parsed.value.timestamp,
                step: 'specify',
                sessionId: parsed.value.sessionId,
                text: parsed.value.message,
                messageId: parsed.value.messageId,
                raw: parsed.value.raw
              }));
            } else {
              queryApi.dispatch(recordActivity({
                timestamp: parsed.value.timestamp,
                level: 'progress',
                message: parsed.value.message,
                kind: parsed.value.kind,
                event: parsed.value.kind === 'generic' ? undefined : parsed.value.kind,
                step: 'specify',
                sessionId: parsed.value.sessionId,
                raw: parsed.value.raw
              }));
            }
          } else if (parsed.value.status === 'pass') {
            queryApi.dispatch(specifyRunSucceeded({ specMarkdown: parsed.value.specMarkdown ?? '', artifactPath: parsed.value.artifactPath ?? 'specs/0006-specify-vertical/spec.md', commitSha: parsed.value.commitSha ?? '' }));
            queryApi.dispatch(stepCompleted({ step: 'specify', commitSha: parsed.value.commitSha ?? '', trailer: 'Concierge-Step: specify:pass' }));
            queryApi.dispatch(stepPending({ step: 'clarify', sessionId: parsed.value.sessionId }));
            queryApi.dispatch(specifyCompletedInWorkspace());
            if (parsed.value.branch !== undefined && parsed.value.branch.length > 0) {
              queryApi.dispatch(branchUpdated({ branch: parsed.value.branch }));
            }
            queryApi.dispatch(activityBusyChanged({ busy: false, status: 'Specify complete' }));
            teardown();
          } else {
            const message = parsed.value.reason ?? 'Specify failed';
            queryApi.dispatch(specifyRunFailed({ reason: message }));
            queryApi.dispatch(activityBusyChanged({ busy: false, status: 'Specify failed' }));
            queryApi.dispatch(toastShown({ level: 'error', message: `Specify failed: ${message}` }));
            teardown();
          }
        });
        const response = await baseQuery({ channel: 'copilot:specify', payload: { ...arg, subscriptionId, modelId: arg.modelId ?? undefined } });
        if (response.error !== undefined) {
          teardown();
          const message = response.error.data?.message ?? 'Specify IPC call failed';
          console.error('[copilot:specify]', message, response.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Specify failed: ${message}` }));
          return { error: response.error };
        }
        const parsed = parseRendererCopilotSpecifyAck(response.data);
        if (!parsed.ok) {
          teardown();
          console.error('[copilot:specify] ack parse failed', parsed.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Specify failed: ${parsed.error.message}` }));
          return { error: parsingError(parsed.error) };
        }
        queryApi.dispatch(specifyRunStarted({ sessionId: parsed.value.sessionId, modelId: arg.modelId }));
        queryApi.dispatch(stepPending({ step: 'specify', sessionId: parsed.value.sessionId }));
        // Safety ceiling well above the longest real run (~370s); the listener is normally
        // torn down by the terminal done event above. Cleared inside teardown().
        guardTimer = setTimeout(teardown, 3_600_000);
        return { data: parsed.value };
      },
      invalidatesTags: ['StepState', 'Step', 'Transcript']
    })
  })
});
