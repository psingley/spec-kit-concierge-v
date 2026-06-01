import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererGitBranchResult, parseRendererGitState, type RendererGitBranchResult, type RendererGitState } from './git.factory';

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
    }),
    checkoutBranch: builder.mutation<RendererGitBranchResult, { repositoryPath: string; branch: string }>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'git:checkout', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererGitBranchResult(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      invalidatesTags: ['GitState', 'Workspace', 'StepState']
    }),
    resetToMain: builder.mutation<RendererGitBranchResult, { repositoryPath: string; defaultBranch: string }>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'git:resetMain', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererGitBranchResult(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      invalidatesTags: ['GitState', 'Workspace', 'StepState']
    })
  })
});
