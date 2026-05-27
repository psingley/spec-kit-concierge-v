import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererPreferences, type RendererPreferencesState } from './preferences.factory';

export type PreferencesReadArgs = {
  scope: 'user';
};

export type PreferencesWriteArgs = {
  theme: RendererPreferencesState['theme'];
};

export const preferencesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPreferences: builder.query<RendererPreferencesState, PreferencesReadArgs>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'preferences:read', payload: arg });
        if (response.error !== undefined) {
          return { error: response.error };
        }
        const parsed = parseRendererPreferences(response.data);

        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['Preferences']
    }),
    writePreferences: builder.mutation<RendererPreferencesState, PreferencesWriteArgs>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'preferences:write', payload: arg });
        if (response.error !== undefined) {
          return { error: response.error };
        }
        const parsed = parseRendererPreferences(response.data);

        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      invalidatesTags: ['Preferences']
    })
  })
});
