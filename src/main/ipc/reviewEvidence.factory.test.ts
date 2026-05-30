import { describe, expect, it } from 'vitest';
import { createReviewEvidenceRequest } from './reviewEvidence.factory';

describe('review evidence IPC factory', () => {
  it('accepts only absolute repository and feature paths', () => {
    expect(createReviewEvidenceRequest({ repositoryPath: '/repo', featureDir: '/repo/specs/0009' })).toMatchObject({
      ok: true,
      value: { mode: 'summary', repositoryPath: '/repo', featureDir: '/repo/specs/0009' }
    });

    expect(createReviewEvidenceRequest({ repositoryPath: '/repo', featureDir: 'specs/0009' })).toMatchObject({
      ok: false
    });
  });

  it('accepts body-read requests for app-owned evidence paths', () => {
    expect(createReviewEvidenceRequest({
      mode: 'body',
      repositoryPath: '/repo',
      featureDir: '/repo/specs/0009',
      artifactPath: '/user/evidence/0009/analyze-report.md'
    })).toMatchObject({
      ok: true,
      value: { mode: 'body', artifactPath: '/user/evidence/0009/analyze-report.md' }
    });
  });
});
