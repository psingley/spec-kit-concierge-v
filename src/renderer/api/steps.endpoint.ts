import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererStepState, type RendererStepState } from './steps.factory';

export type StepsReadArgs = {
  commits: Array<{ sha: string; message: string }>;
};

export const stepsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getStepState: builder.query<RendererStepState, StepsReadArgs>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'steps:read', payload: arg });
        if (response.error !== undefined) {
          return { error: response.error };
        }
        const parsed = parseRendererStepState(response.data);

        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['StepState', 'Step']
    })
  })
});
