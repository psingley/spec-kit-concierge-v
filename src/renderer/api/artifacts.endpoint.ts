import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererArtifact, type RendererArtifact } from './artifacts.factory';

export const artifactsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    readArtifact: builder.query<RendererArtifact, { repositoryPath: string; artifactPath: string }>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'artifacts:read', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererArtifact(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['Step', 'Transcript']
    })
  })
});
