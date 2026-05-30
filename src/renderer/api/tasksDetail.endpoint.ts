import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererTasksDetail, type RendererTasksDetail } from './tasksDetail.factory';

export const tasksDetailApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTasksDetail: builder.query<RendererTasksDetail, { repositoryPath: string; artifactPath: string }>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'tasks:detail', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererTasksDetail(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['Step', 'Transcript']
    })
  })
});
