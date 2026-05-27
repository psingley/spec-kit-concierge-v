import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererAuthStatus, type RendererAuthStatus } from './auth.factory';

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
    })
  })
});
