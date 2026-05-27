import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { validateReviewArtifacts } from './review.factory';

const fsMocks = vi.hoisted(() => ({ readFile: vi.fn() }));

vi.mock('node:fs/promises', () => ({
  default: { readFile: fsMocks.readFile },
  readFile: fsMocks.readFile
}));

describe('validateReviewArtifacts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty-file commit candidate when review artifact is absent', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('missing'));

    const result = await validateReviewArtifacts('/feature');

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ commit: { step: 'review', files: [] } });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(1);
  });

  it('returns empty-file commit candidate for valid optional review artifact', async () => {
    vi.mocked(readFile).mockResolvedValue('# Review\nLooks good' as never);

    const result = await validateReviewArtifacts('/feature');

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ commit: { step: 'review', status: 'pass', message: 'Concierge review step' } });
    expect(vi.mocked(readFile)).toHaveBeenCalledWith(expect.stringContaining('review.md'), 'utf8');
  });

  it('rejects malformed optional review artifact as an edge case', async () => {
    vi.mocked(readFile).mockResolvedValue('bad-review' as never);

    const result = await validateReviewArtifacts('/feature');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: 'escape-hatch' });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(1);
  });
});
