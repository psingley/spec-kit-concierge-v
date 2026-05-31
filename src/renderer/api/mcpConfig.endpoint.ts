import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import {
  parseRendererMcpConfigFixResult,
  parseRendererMcpConfigStatus,
  type RendererMcpConfigFixResult,
  type RendererMcpConfigStatus
} from './mcpConfig.factory';
import { atlassianMcpStatusHydrated } from '../slices/auth';
import { recordActivity } from '../slices/activity';

export const mcpConfigApi = api.injectEndpoints({
  endpoints: (builder) => ({
    checkMcpConfig: builder.query<RendererMcpConfigStatus, void>({
      async queryFn(_arg, queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'mcp:config:check', payload: {} });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererMcpConfigStatus(response.data);
        if (!parsed.ok) return { error: parsingError(parsed.error) };
        queryApi.dispatch(atlassianMcpStatusHydrated(parsed.value));
        return { data: parsed.value };
      },
      providesTags: ['Agent']
    }),
    fixMcpConfig: builder.mutation<RendererMcpConfigFixResult, { reason: 'startup' | 'workspace_repo_changed' | 'user_action' }>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'mcp:config:fix', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererMcpConfigFixResult(response.data);
        if (!parsed.ok) return { error: parsingError(parsed.error) };
        queryApi.dispatch(atlassianMcpStatusHydrated(parsed.value.status));
        if (parsed.value.activityNotice !== undefined) {
          queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'ok', message: parsed.value.activityNotice }));
        }
        if (parsed.value.error !== undefined) {
          queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'error', message: parsed.value.error.message }));
        }
        return { data: parsed.value };
      },
      invalidatesTags: ['Agent']
    })
  })
});
