import { describe, expect, it } from 'vitest';
import { createReviewEvidenceRequest } from './reviewEvidence.factory';

describe('review evidence IPC factory', () => {
  it('accepts an absolute repository path without a renderer-supplied feature dir', () => {
    expect(createReviewEvidenceRequest({ repositoryPath: '/repo' })).toMatchObject({
      ok: true,
      value: { mode: 'summary', repositoryPath: '/repo' }
    });

    expect(createReviewEvidenceRequest({ repositoryPath: 'repo' })).toMatchObject({
      ok: false
    });
  });

  it('rejects a renderer-supplied feature dir (resolved server-side from feature.json)', () => {
    expect(createReviewEvidenceRequest({ repositoryPath: '/repo', featureDir: '/repo/specs/0009' })).toMatchObject({
      ok: false
    });
  });

  it('accepts body-read requests for app-owned evidence paths', () => {
    expect(createReviewEvidenceRequest({
      mode: 'body',
      repositoryPath: '/repo',
      artifactPath: '/user/evidence/0009/analyze-report.md'
    })).toMatchObject({
      ok: true,
      value: { mode: 'body', artifactPath: '/user/evidence/0009/analyze-report.md' }
    });
  });
});
