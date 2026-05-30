import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { parseRendererReviewEvidence, parseRendererReviewEvidenceBody, type ReviewEvidence, type ReviewEvidenceBody } from './reviewEvidence.factory';

export const reviewEvidenceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getReviewEvidence: builder.query<ReviewEvidence, { repositoryPath: string; featureDir: string }>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'review:evidence', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererReviewEvidence(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['Step', 'Transcript']
    }),
    readReviewEvidenceBody: builder.query<ReviewEvidenceBody, { repositoryPath: string; featureDir: string; artifactPath: string }>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'review:evidence', payload: { ...arg, mode: 'body' } });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseRendererReviewEvidenceBody(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['Step', 'Transcript']
    })
  })
});
