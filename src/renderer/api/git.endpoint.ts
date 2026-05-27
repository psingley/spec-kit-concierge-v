import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererGitState, type RendererGitState } from './git.factory';

export type GitReadArgs = {
  repositoryPath: string;
  paths: string[];
};

export const gitApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getGitState: builder.query<RendererGitState, GitReadArgs>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'git:read', payload: arg });
        if (response.error !== undefined) {
          return { error: response.error };
        }
        const parsed = parseRendererGitState(response.data);

        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['GitState', 'Workspace']
    })
  })
});
