import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererEnsureLocalRepo, type RendererEnsureLocalRepo } from './ensureLocalRepo.factory';

export type EnsureLocalRepoArgs = {
  owner: string;
  name: string;
  cloneUrl: string;
};

export const ensureLocalRepoApi = api.injectEndpoints({
  endpoints: (builder) => ({
    ensureLocalRepo: builder.mutation<RendererEnsureLocalRepo, EnsureLocalRepoArgs>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'repo:ensureLocal', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererEnsureLocalRepo(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      invalidatesTags: ['Workspace']
    })
  })
});
