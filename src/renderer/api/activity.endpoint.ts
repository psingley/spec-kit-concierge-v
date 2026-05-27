import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererActivity, type RendererActivityState } from './activity.factory';

export type ActivityReadArgs = {
  limit: number;
};

export const activityApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getActivity: builder.query<RendererActivityState, ActivityReadArgs>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'activity:read', payload: arg });
        if (response.error !== undefined) {
          return { error: response.error };
        }
        const parsed = parseRendererActivity(response.data);

        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['Transcript']
    })
  })
});
