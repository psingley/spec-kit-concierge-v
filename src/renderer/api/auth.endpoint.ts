import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import {
  parseRendererAuthLoginResult,
  parseRendererAuthStatus,
  type RendererAuthLoginResult,
  type RendererAuthStatus
} from './auth.factory';
import { authLoginFailed, authLoginStarted, copilotLoginSucceeded, githubLoginSucceeded } from '../slices/auth';
import { recordActivity } from '../slices/activity';
import { toastShown } from '../slices/ui';

export type AuthStatusArgs = {
  providers: Array<'copilot' | 'github'>;
};

export type LoginCopilotArgs = {
  subscriptionId?: string;
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
            const message = response.error.data?.message ?? 'GitHub login failed';
            console.error('[auth:gh:login]', message, response.error);
            queryApi.dispatch(authLoginFailed({ provider: 'github', message }));
            queryApi.dispatch(toastShown({ level: 'error', message: `GitHub sign-in failed: ${message}` }));
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
          const message = error instanceof Error ? error.message : String(error);
          console.error('[auth:gh:login] unexpected error', error);
          queryApi.dispatch(authLoginFailed({ provider: 'github', message }));
          queryApi.dispatch(toastShown({ level: 'error', message: `GitHub sign-in failed: ${message}` }));
          return { error: { status: 'IPC_ERROR', data: { name: 'AuthError', message } } };
        }
      },
      invalidatesTags: ['Agent']
    }),
    loginCopilot: builder.mutation<RendererAuthLoginResult, LoginCopilotArgs | void>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        queryApi.dispatch(authLoginStarted({ provider: 'copilot' }));
        try {
          const response = await baseQuery({
            channel: 'auth:copilot:login',
            payload: arg?.subscriptionId === undefined
              ? { provider: 'copilot' }
              : { provider: 'copilot', subscriptionId: arg.subscriptionId }
          });
          if (response.error !== undefined) {
            const message = response.error.data?.message ?? 'Copilot login failed';
            console.error('[auth:copilot:login]', message, response.error);
            queryApi.dispatch(authLoginFailed({ provider: 'copilot', message }));
            queryApi.dispatch(toastShown({ level: 'error', message: `Copilot sign-in failed: ${message}` }));
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
          const message = error instanceof Error ? error.message : String(error);
          console.error('[auth:copilot:login] unexpected error', error);
          queryApi.dispatch(authLoginFailed({ provider: 'copilot', message }));
          queryApi.dispatch(toastShown({ level: 'error', message: `Copilot sign-in failed: ${message}` }));
          return { error: { status: 'IPC_ERROR', data: { name: 'AuthError', message } } };
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
            const message = response.error.data?.message ?? 'Atlassian login failed';
            console.error('[auth:atlassian:login]', message, response.error);
            queryApi.dispatch(authLoginFailed({ provider: 'atlassian', message }));
            queryApi.dispatch(toastShown({ level: 'error', message: `Atlassian sign-in failed: ${message}` }));
            return { error: response.error };
          }
          const parsed = parseRendererAuthLoginResult(response.data);
          if (!parsed.ok) {
            console.error('[auth:atlassian:login] parse error', parsed.error);
            queryApi.dispatch(authLoginFailed({ provider: 'atlassian', message: parsed.error.message }));
            queryApi.dispatch(toastShown({ level: 'error', message: `Atlassian sign-in failed: ${parsed.error.message}` }));
            return { error: parsingError(parsed.error) };
          }
          queryApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'ok', message: parsed.value.label ?? 'Atlassian MCP configured' }));
          return { data: parsed.value };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('[auth:atlassian:login] unexpected error', error);
          queryApi.dispatch(authLoginFailed({ provider: 'atlassian', message }));
          queryApi.dispatch(toastShown({ level: 'error', message: `Atlassian sign-in failed: ${message}` }));
          return { error: { status: 'IPC_ERROR', data: { name: 'AuthError', message } } };
        }
      },
      invalidatesTags: ['Agent']
    })
  })
});
