import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererWorkspace, type RendererWorkspaceState } from './workspace.factory';

export type WorkspaceReadArgs = {
  repositoryPath: string;
};

export const workspaceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getWorkspace: builder.query<RendererWorkspaceState, WorkspaceReadArgs>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'workspace:read', payload: arg });
        if (response.error !== undefined) {
          return { error: response.error };
        }
        const parsed = parseRendererWorkspace(response.data);

        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['Workspace']
    })
  })
});
