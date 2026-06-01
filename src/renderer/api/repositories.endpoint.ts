import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererRepositories, type RendererRepositories } from './repositories.factory';

export const repositoriesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listRepos: builder.query<RendererRepositories, void>({
      async queryFn(_arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'repos:list', payload: {} });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererRepositories(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['Workspace']
    })
  })
});
