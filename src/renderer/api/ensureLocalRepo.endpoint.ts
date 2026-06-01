import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererEnsureLocalRepo, type RendererEnsureLocalRepo } from './ensureLocalRepo.factory';
import { toastShown } from '../slices/ui';

export type EnsureLocalRepoArgs = {
  owner: string;
  name: string;
  cloneUrl: string;
};

export const ensureLocalRepoApi = api.injectEndpoints({
  endpoints: (builder) => ({
    ensureLocalRepo: builder.mutation<RendererEnsureLocalRepo, EnsureLocalRepoArgs>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'repo:ensureLocal', payload: arg });
        if (response.error !== undefined) {
          const message = response.error.data?.message ?? 'Failed to prepare repository';
          console.error('[repo:ensureLocal]', message, response.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Repository clone failed: ${message}` }));
          return { error: response.error };
        }
        const parsed = parseRendererEnsureLocalRepo(response.data);
        if (!parsed.ok) {
          console.error('[repo:ensureLocal] parse error', parsed.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Repository clone failed: ${parsed.error.message}` }));
          return { error: parsingError(parsed.error) };
        }
        return { data: parsed.value };
      },
      invalidatesTags: ['Workspace']
    })
  })
});
