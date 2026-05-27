import { createApi } from '@reduxjs/toolkit/query';
import { ipcBaseQuery } from './baseQuery';

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
    })
  })
});
