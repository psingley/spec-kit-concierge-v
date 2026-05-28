import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererBranchSessions, type RendererBranchSessions } from './branches.factory';

export const branchesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listBranchSessions: builder.query<RendererBranchSessions, { repositoryPath: string }>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'branches:sessions', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererBranchSessions(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['StepState', 'Workspace']
    })
  })
});
