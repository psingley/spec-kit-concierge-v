import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { validateSpecifyArtifacts } from './specify.factory';

const fsMocks = vi.hoisted(() => ({ readFile: vi.fn() }));

vi.mock('node:fs/promises', () => ({
  default: { readFile: fsMocks.readFile },
  readFile: fsMocks.readFile
}));

describe('validateSpecifyArtifacts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns commit candidate for valid spec markdown', async () => {
    vi.mocked(readFile).mockResolvedValue('# Feature\nRequirements' as never);

    const result = await validateSpecifyArtifacts('/feature');

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ commit: { step: 'specify', status: 'pass', files: ['spec.md'] } });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(2);
  });

  it('rejects missing required spec artifacts', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('missing'));

    const result = await validateSpecifyArtifacts('/feature');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ escapeHatchReason: 'factory-rejected' });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(1);
  });

  it('rejects specs without markdown headings as an edge case', async () => {
    vi.mocked(readFile).mockResolvedValue('plain text only' as never);

    const result = await validateSpecifyArtifacts('/feature');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: 'escape-hatch' });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(2);
  });
});
