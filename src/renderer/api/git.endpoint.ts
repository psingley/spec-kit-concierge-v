import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererGitBranchResult, parseRendererGitState, type RendererGitBranchResult, type RendererGitState } from './git.factory';
import { draftSessionCreated, workspaceEntered, type RepositorySummary } from '../slices/workspace';
import { toastShown } from '../slices/ui';

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
    createDraftBranch: builder.mutation<RendererGitBranchResult, { repo: RepositorySummary }>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        try {
          const response = await baseQuery({
            channel: 'git:createDraft',
            payload: { repositoryPath: arg.repo.path, defaultBranch: arg.repo.defaultBranch }
          });
          if (response.error !== undefined) {
            const msg = response.error.data?.message ?? 'Failed to create draft branch';
            console.error('[git:createDraft]', msg, response.error);
            queryApi.dispatch(toastShown({ level: 'error', message: `Session start failed: ${msg}` }));
            return { error: response.error };
          }
          const parsed = parseRendererGitBranchResult(response.data);
          if (!parsed.ok) return { error: parsingError(parsed.error) };
          queryApi.dispatch(workspaceEntered({ repo: arg.repo, branch: parsed.value.branch }));
          queryApi.dispatch(draftSessionCreated({ branch: parsed.value.branch }));
          return { data: parsed.value };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          console.error('[git:createDraft] unexpected error', error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Session start failed: ${msg}` }));
          return { error: { status: 'CUSTOM_ERROR', data: { message: msg }, error: msg } };
        }
      },
      invalidatesTags: ['GitState', 'Workspace', 'StepState']
    })
  })
});
