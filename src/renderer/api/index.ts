import { createApi } from '@reduxjs/toolkit/query';
import { ipcBaseQuery } from './baseQuery';
import {
  parseRendererBoundCLICapabilities,
  type RendererBoundCLICapabilities
} from './capabilities.factory';

export const RUN2_TAG_TYPES = [
  'Workspace',
  'StepState',
  'GitState',
  'Agent',
  'Session',
  'Step',
  'Transcript',
  'Preferences'
] as const;

export type AppVersionProof = {
  version: string;
};

export const api = createApi({
  reducerPath: 'conciergeApi',
  baseQuery: ipcBaseQuery,
  tagTypes: RUN2_TAG_TYPES,
  endpoints: (builder) => ({
    getAppVersion: builder.query<AppVersionProof, void>({
      query: () => ({ channel: 'app:getVersion' })
    }),
    getBoundCLICapabilities: builder.query<RendererBoundCLICapabilities, void>({
      async queryFn(_arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'acp:probeBoundCLI' });

        if (response.error !== undefined) {
          return { error: response.error };
        }

        const parsed = parseRendererBoundCLICapabilities(response.data);
        if (!parsed.ok) {
          return {
            error: {
              status: 'PARSING_ERROR',
              data: {
                name: parsed.error.name,
                message: parsed.error.message
              }
            }
          };
        }

        return { data: parsed.value };
      },
      providesTags: ['Agent']
    })
  })
});
