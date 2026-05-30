import { beforeEach, describe, expect, it, vi } from 'vitest';
import { afterReviewHook } from './afterReview.hook';

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('afterReviewHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('completes review without producing a Step Commit', async () => {
    const result = await afterReviewHook(context);

    expect(result).toMatchObject({ ok: true, phase: 'after', step: 'review', lifecycleAction: 'complete' });
    expect(result).not.toHaveProperty('commit');
  });

  it('does not call the injected validator or commit writer', async () => {
    const validateArtifacts = vi.fn();
    const commitWithTrailer = vi.fn();

    const result = await afterReviewHook({ ...context, validateArtifacts, commitWithTrailer });

    expect(result.ok).toBe(true);
    expect(validateArtifacts).not.toHaveBeenCalled();
    expect(commitWithTrailer).not.toHaveBeenCalled();
  });
});
