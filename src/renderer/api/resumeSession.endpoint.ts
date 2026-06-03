import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererResumeSession, type RendererResumeSession } from './resumeSession.factory';
import { toastShown } from '../slices/ui';

export type ResumeSessionArgs = {
  worktreePath: string;
};

export const resumeSessionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    resumeSession: builder.mutation<RendererResumeSession, ResumeSessionArgs>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'repo:resumeSession', payload: arg });
        if (response.error !== undefined) {
          const message = response.error.data?.message ?? 'Failed to resume session';
          console.error('[repo:resumeSession]', message, response.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Session resume failed: ${message}` }));
          return { error: response.error };
        }
        const parsed = parseRendererResumeSession(response.data);
        if (!parsed.ok) {
          console.error('[repo:resumeSession] parse error', parsed.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Session resume failed: ${parsed.error.message}` }));
          return { error: parsingError(parsed.error) };
        }
        return { data: parsed.value };
      }
    })
  })
});
