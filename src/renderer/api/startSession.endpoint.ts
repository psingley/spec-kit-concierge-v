import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererStartSession, type RendererStartSession } from './startSession.factory';

export type StartSessionArgs = {
  clonePath: string;
  defaultBranch: string;
  description: string;
  shortName?: string;
};

export const startSessionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    startSession: builder.mutation<RendererStartSession, StartSessionArgs>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'repo:startSession', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererStartSession(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      invalidatesTags: ['Workspace']
    })
  })
});
