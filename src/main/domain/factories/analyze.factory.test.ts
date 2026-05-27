import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { validateAnalyzeArtifacts } from './analyze.factory';

const fsMocks = vi.hoisted(() => ({ readFile: vi.fn() }));

vi.mock('node:fs/promises', () => ({
  default: { readFile: fsMocks.readFile },
  readFile: fsMocks.readFile
}));

describe('validateAnalyzeArtifacts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns allow-empty commit candidate for valid analysis', async () => {
    vi.mocked(readFile).mockResolvedValue('# Analysis' as never);

    const result = await validateAnalyzeArtifacts('/feature');

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ commit: { step: 'analyze', files: ['analyze.md'], allowEmptyCommit: true } });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(1);
  });

  it('rejects missing required analyze artifact', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('missing'));

    const result = await validateAnalyzeArtifacts('/feature');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ escapeHatchReason: 'factory-rejected' });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(1);
  });

  it('rejects bad analysis edge case', async () => {
    vi.mocked(readFile).mockResolvedValue('bad-analysis' as never);

    const result = await validateAnalyzeArtifacts('/feature');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: 'escape-hatch' });
    expect(vi.mocked(readFile)).toHaveBeenCalledWith(expect.stringContaining('analyze.md'), 'utf8');
  });
});
