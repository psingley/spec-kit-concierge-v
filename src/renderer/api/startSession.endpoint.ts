import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererStartSession, type RendererStartSession } from './startSession.factory';
import { toastShown } from '../slices/ui';

export type StartSessionArgs = {
  clonePath: string;
  defaultBranch: string;
  description: string;
  shortName?: string;
};

export const startSessionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    startSession: builder.mutation<RendererStartSession, StartSessionArgs>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'repo:startSession', payload: arg });
        if (response.error !== undefined) {
          const message = response.error.data?.message ?? 'Failed to start session';
          console.error('[repo:startSession]', message, response.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Session start failed: ${message}` }));
          return { error: response.error };
        }
        const parsed = parseRendererStartSession(response.data);
        if (!parsed.ok) {
          console.error('[repo:startSession] parse error', parsed.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Session start failed: ${parsed.error.message}` }));
          return { error: parsingError(parsed.error) };
        }
        return { data: parsed.value };
      },
      invalidatesTags: ['Workspace']
    })
  })
});
