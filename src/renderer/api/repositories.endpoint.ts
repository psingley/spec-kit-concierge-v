import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererRepositories, type RendererRepositories } from './repositories.factory';
import { toastShown } from '../slices/ui';

export const repositoriesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listRepos: builder.query<RendererRepositories, void>({
      async queryFn(_arg, queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'repos:list', payload: {} });
        if (response.error !== undefined) {
          const message = response.error.data?.message ?? 'Failed to list repositories';
          console.error('[repos:list]', message, response.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Repository list failed: ${message}` }));
          return { error: response.error };
        }
        const parsed = parseRendererRepositories(response.data);
        if (!parsed.ok) {
          console.error('[repos:list] parse error', parsed.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Repository list failed: ${parsed.error.message}` }));
          return { error: parsingError(parsed.error) };
        }
        return { data: parsed.value };
      },
      providesTags: ['Workspace']
    })
  })
});
