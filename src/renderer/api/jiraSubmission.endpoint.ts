import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import {
  parseRendererJiraDryRunPreview,
  parseRendererJiraSubmissionAck,
  parseRendererJiraSubmissionEvent,
  type RendererJiraSubmissionAck
} from './jiraSubmission.factory';
import {
  jiraDryRunPreviewLoaded,
  jiraSubmissionFailed,
  jiraSubmissionResultRecorded,
  jiraSubmissionStarted,
  jiraSubmissionSucceeded,
  type JiraDryRunPreview
} from '../slices/jira';
import { toastShown } from '../slices/ui';

export type JiraSubmissionArgs = {
  repositoryPath: string;
};

export const jiraSubmissionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    dryRunJiraSubmission: builder.mutation<JiraDryRunPreview, JiraSubmissionArgs>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'jira:dryRun', payload: arg });
        if (response.error !== undefined) {
          return { error: response.error };
        }
        const parsed = parseRendererJiraDryRunPreview(response.data);
        if (!parsed.ok) {
          return { error: parsingError(parsed.error) };
        }
        queryApi.dispatch(jiraDryRunPreviewLoaded(parsed.value));
        return { data: parsed.value };
      }
    }),
    submitJiraSubmission: builder.mutation<RendererJiraSubmissionAck, JiraSubmissionArgs>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const subscriptionId = `jira-${Date.now().toString(36)}`;
        let unsubscribed = false;
        const teardownState: { guardTimer?: ReturnType<typeof setTimeout> } = {};
        const teardown = () => {
          if (unsubscribed) return;
          unsubscribed = true;
          if (teardownState.guardTimer !== undefined) clearTimeout(teardownState.guardTimer);
          unsubscribe();
        };
        const unsubscribe = window.concierge.jiraSubmission!.subscribeSubmit(subscriptionId, (event) => {
          const parsed = parseRendererJiraSubmissionEvent(event);
          if (!parsed.ok) {
            queryApi.dispatch(toastShown({ level: 'error', message: `JIRA event ignored: ${parsed.error.message}` }));
            return;
          }
          if (parsed.value.type === 'result') {
            queryApi.dispatch(jiraSubmissionResultRecorded(parsed.value));
          }
          if (parsed.value.type === 'done') {
            if (parsed.value.status === 'pass') {
              queryApi.dispatch(jiraSubmissionSucceeded({ issues: parsed.value.issues.map((issue) => ({ key: issue.key, url: issue.url })) }));
            } else {
              queryApi.dispatch(jiraSubmissionFailed({ message: parsed.value.reason, remaining: parsed.value.remainingNodeIds }));
              queryApi.dispatch(toastShown({ level: 'error', message: `JIRA submission failed: ${parsed.value.reason}` }));
            }
            teardown();
          }
        });
        queryApi.dispatch(jiraSubmissionStarted());
        const response = await baseQuery({ channel: 'jira:submit', payload: { ...arg, subscriptionId } });
        if (response.error !== undefined) {
          teardown();
          queryApi.dispatch(jiraSubmissionFailed({ message: response.error.data.message }));
          return { error: response.error };
        }
        const parsed = parseRendererJiraSubmissionAck(response.data);
        if (!parsed.ok) {
          teardown();
          queryApi.dispatch(jiraSubmissionFailed({ message: parsed.error.message }));
          return { error: parsingError(parsed.error) };
        }
        teardownState.guardTimer = setTimeout(teardown, 3_600_000);
        return { data: parsed.value };
      },
      invalidatesTags: ['JiraSubmission']
    })
  })
});
