import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererResumeSession, type RendererResumeSession } from './resumeSession.factory';

export type ResumeSessionArgs = {
  worktreePath: string;
};

export const resumeSessionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    resumeSession: builder.mutation<RendererResumeSession, ResumeSessionArgs>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'repo:resumeSession', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererResumeSession(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      }
    })
  })
});
