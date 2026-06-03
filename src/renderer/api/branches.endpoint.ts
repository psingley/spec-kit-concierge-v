import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererBranchSessions, type RendererBranchSessions } from './branches.factory';
import { toastShown } from '../slices/ui';

export const branchesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listBranchSessions: builder.query<RendererBranchSessions, { repositoryPath: string }>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'branches:sessions', payload: arg });
        if (response.error !== undefined) {
          const message = response.error.data?.message ?? 'Failed to list branch sessions';
          console.error('[branches:sessions]', message, response.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Branch sessions failed: ${message}` }));
          return { error: response.error };
        }
        const parsed = parseRendererBranchSessions(response.data);
        if (!parsed.ok) {
          console.error('[branches:sessions] parse error', parsed.error);
          queryApi.dispatch(toastShown({ level: 'error', message: `Branch sessions failed: ${parsed.error.message}` }));
          return { error: parsingError(parsed.error) };
        }
        return { data: parsed.value };
      },
      providesTags: ['StepState', 'Workspace']
    })
  })
});
