import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import {
  parseRendererAuthLoginResult,
  parseRendererAuthStatus,
  type RendererAuthLoginResult,
  type RendererAuthStatus
} from './auth.factory';
import {
  atlassianLoginSucceeded,
  authLoginFailed,
  authLoginStarted,
  copilotLoginSucceeded,
  githubLoginSucceeded
} from '../slices/auth';
import { recordActivity } from '../slices/activity';

export type AuthStatusArgs = {
  providers: Array<'copilot' | 'github'>;
};

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAuthStatus: builder.query<RendererAuthStatus, AuthStatusArgs>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'auth:status', payload: arg });
        if (response.error !== undefined) {
          return { error: response.error };
        }
        const parsed = parseRendererAuthStatus(response.data);

        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['Agent']
    }),
    loginGitHub: builder.mutation<RendererAuthLoginResult, void>({
      async queryFn(_arg, queryApi, _extraOptions, baseQuery) {
        queryApi.dispatch(authLoginStarted({ provider: 'github' }));
        const response = await baseQuery({ channel: 'auth:gh:login', payload: { provider: 'github' } });
        if (response.error !== undefined) {
          queryApi.dispatch(authLoginFailed({ provider: 'github', message: response.error.data.message }));
          return { error: response.error };
        }
        const parsed = parseRendererAuthLoginResult(response.data);
        if (!parsed.ok) {
          queryApi.dispatch(authLoginFailed({ provider: 'github', message: parsed.error.message }));
          return { error: parsingError(parsed.error) };
        }
        queryApi.dispatch(githubLoginSucceeded({ identity: parsed.value.identity ?? { login: 'github-user' } }));
        queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'ok', message: 'GitHub connected' }));
        return { data: parsed.value };
      },
      invalidatesTags: ['Agent']
    }),
    loginCopilot: builder.mutation<RendererAuthLoginResult, void>({
      async queryFn(_arg, queryApi, _extraOptions, baseQuery) {
        queryApi.dispatch(authLoginStarted({ provider: 'copilot' }));
        const response = await baseQuery({ channel: 'auth:copilot:login', payload: { provider: 'copilot' } });
        if (response.error !== undefined) {
          queryApi.dispatch(authLoginFailed({ provider: 'copilot', message: response.error.data.message }));
          return { error: response.error };
        }
        const parsed = parseRendererAuthLoginResult(response.data);
        if (!parsed.ok) {
          queryApi.dispatch(authLoginFailed({ provider: 'copilot', message: parsed.error.message }));
          return { error: parsingError(parsed.error) };
        }
        queryApi.dispatch(copilotLoginSucceeded());
        queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'ok', message: 'Copilot connected' }));
        return { data: parsed.value };
      },
      invalidatesTags: ['Agent']
    }),
    loginAtlassianStub: builder.mutation<RendererAuthLoginResult, void>({
      async queryFn(_arg, queryApi, _extraOptions, baseQuery) {
        queryApi.dispatch(authLoginStarted({ provider: 'atlassian' }));
        const response = await baseQuery({ channel: 'auth:atlassian:login', payload: { provider: 'atlassian' } });
        if (response.error !== undefined) {
          queryApi.dispatch(authLoginFailed({ provider: 'atlassian', message: response.error.data.message }));
          return { error: response.error };
        }
        const parsed = parseRendererAuthLoginResult(response.data);
        if (!parsed.ok) {
          queryApi.dispatch(authLoginFailed({ provider: 'atlassian', message: parsed.error.message }));
          return { error: parsingError(parsed.error) };
        }
        queryApi.dispatch(atlassianLoginSucceeded());
        queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'ok', message: 'Atlassian stub connected' }));
        return { data: parsed.value };
      },
      invalidatesTags: ['Agent']
    })
  })
});
