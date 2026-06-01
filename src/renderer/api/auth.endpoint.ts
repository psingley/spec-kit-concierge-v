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
import { toastShown } from '../slices/ui';

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
        try {
          const response = await baseQuery({ channel: 'auth:gh:login', payload: { provider: 'github' } });
          if (response.error !== undefined) {
            const msg = response.error.data?.message ?? 'GitHub login failed';
            console.error('[auth:gh:login]', msg, response.error);
            queryApi.dispatch(authLoginFailed({ provider: 'github', message: msg }));
            queryApi.dispatch(toastShown({ level: 'error', message: `GitHub sign-in failed: ${msg}` }));
            return { error: response.error };
          }
          const parsed = parseRendererAuthLoginResult(response.data);
          if (!parsed.ok) {
            console.error('[auth:gh:login] parse error', parsed.error);
            queryApi.dispatch(authLoginFailed({ provider: 'github', message: parsed.error.message }));
            queryApi.dispatch(toastShown({ level: 'error', message: `GitHub sign-in failed: ${parsed.error.message}` }));
            return { error: parsingError(parsed.error) };
          }
          queryApi.dispatch(githubLoginSucceeded({ identity: parsed.value.identity ?? { login: 'github-user' } }));
          queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'ok', message: 'GitHub connected' }));
          return { data: parsed.value };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          console.error('[auth:gh:login] unexpected error', error);
          queryApi.dispatch(authLoginFailed({ provider: 'github', message: msg }));
          queryApi.dispatch(toastShown({ level: 'error', message: `GitHub sign-in failed: ${msg}` }));
          return { error: { status: 'CUSTOM_ERROR', data: { message: msg }, error: msg } };
        }
      },
      invalidatesTags: ['Agent']
    }),
    loginCopilot: builder.mutation<RendererAuthLoginResult, void>({
      async queryFn(_arg, queryApi, _extraOptions, baseQuery) {
        queryApi.dispatch(authLoginStarted({ provider: 'copilot' }));
        try {
          const response = await baseQuery({ channel: 'auth:copilot:login', payload: { provider: 'copilot' } });
          if (response.error !== undefined) {
            const msg = response.error.data?.message ?? 'Copilot login failed';
            console.error('[auth:copilot:login]', msg, response.error);
            queryApi.dispatch(authLoginFailed({ provider: 'copilot', message: msg }));
            queryApi.dispatch(toastShown({ level: 'error', message: `Copilot sign-in failed: ${msg}` }));
            return { error: response.error };
          }
          const parsed = parseRendererAuthLoginResult(response.data);
          if (!parsed.ok) {
            console.error('[auth:copilot:login] parse error', parsed.error);
            queryApi.dispatch(authLoginFailed({ provider: 'copilot', message: parsed.error.message }));
            queryApi.dispatch(toastShown({ level: 'error', message: `Copilot sign-in failed: ${parsed.error.message}` }));
            return { error: parsingError(parsed.error) };
          }
          queryApi.dispatch(copilotLoginSucceeded());
          queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'ok', message: 'Copilot connected' }));
          return { data: parsed.value };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          console.error('[auth:copilot:login] unexpected error', error);
          queryApi.dispatch(authLoginFailed({ provider: 'copilot', message: msg }));
          queryApi.dispatch(toastShown({ level: 'error', message: `Copilot sign-in failed: ${msg}` }));
          return { error: { status: 'CUSTOM_ERROR', data: { message: msg }, error: msg } };
        }
      },
      invalidatesTags: ['Agent']
    }),
    loginAtlassianStub: builder.mutation<RendererAuthLoginResult, void>({
      async queryFn(_arg, queryApi, _extraOptions, baseQuery) {
        queryApi.dispatch(authLoginStarted({ provider: 'atlassian' }));
        try {
          const response = await baseQuery({ channel: 'auth:atlassian:login', payload: { provider: 'atlassian' } });
          if (response.error !== undefined) {
            const msg = response.error.data?.message ?? 'Atlassian login failed';
            console.error('[auth:atlassian:login]', msg, response.error);
            queryApi.dispatch(authLoginFailed({ provider: 'atlassian', message: msg }));
            queryApi.dispatch(toastShown({ level: 'error', message: `Atlassian sign-in failed: ${msg}` }));
            return { error: response.error };
          }
          const parsed = parseRendererAuthLoginResult(response.data);
          if (!parsed.ok) {
            console.error('[auth:atlassian:login] parse error', parsed.error);
            queryApi.dispatch(authLoginFailed({ provider: 'atlassian', message: parsed.error.message }));
            queryApi.dispatch(toastShown({ level: 'error', message: `Atlassian sign-in failed: ${parsed.error.message}` }));
            return { error: parsingError(parsed.error) };
          }
          queryApi.dispatch(atlassianLoginSucceeded());
          queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'ok', message: 'Atlassian stub connected' }));
          return { data: parsed.value };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          console.error('[auth:atlassian:login] unexpected error', error);
          queryApi.dispatch(authLoginFailed({ provider: 'atlassian', message: msg }));
          queryApi.dispatch(toastShown({ level: 'error', message: `Atlassian sign-in failed: ${msg}` }));
          return { error: { status: 'CUSTOM_ERROR', data: { message: msg }, error: msg } };
        }
      },
      invalidatesTags: ['Agent']
    })
  })
});
