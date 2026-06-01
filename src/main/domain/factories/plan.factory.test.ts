import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { validatePlanArtifacts } from './plan.factory';

const fsMocks = vi.hoisted(() => ({ readFile: vi.fn(), readdir: vi.fn() }));

vi.mock('node:fs/promises', () => ({
  default: { readFile: fsMocks.readFile, readdir: fsMocks.readdir },
  readFile: fsMocks.readFile,
  readdir: fsMocks.readdir
}));

describe('validatePlanArtifacts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns commit candidate for valid plan and research markdown', async () => {
    vi.mocked(readFile)
      .mockResolvedValueOnce('# Plan' as never)
      .mockResolvedValueOnce('# Research' as never)
      .mockRejectedValueOnce(new Error('missing'))
      .mockRejectedValueOnce(new Error('missing'));
    vi.mocked(readdir).mockRejectedValue(new Error('missing'));

    const result = await validatePlanArtifacts('/feature', { contextFilePath: 'CONTEXT.md' });

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ commit: { step: 'plan', files: ['plan.md', 'research.md', 'CONTEXT.md'] } });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(4);
    expect(vi.mocked(readdir)).toHaveBeenCalledWith(expect.stringContaining(path.sep + 'contracts'), { withFileTypes: true });
  });

  it('adds present optional plan artifacts without requiring all of them', async () => {
    vi.mocked(readFile)
      .mockResolvedValueOnce('# Plan' as never)
      .mockResolvedValueOnce('# Research' as never)
      .mockResolvedValueOnce('# Data model' as never)
      .mockRejectedValueOnce(new Error('missing'));
    vi.mocked(readdir).mockResolvedValue([
      { isFile: () => true, name: 'clarify-api.md' },
      { isFile: () => false, name: 'drafts' }
    ] as never);

    const result = await validatePlanArtifacts('/feature');

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({
      commit: { step: 'plan', files: ['plan.md', 'research.md', 'data-model.md', 'contracts/clarify-api.md'] }
    });
  });

  it('rejects missing required plan artifacts', async () => {
    vi.mocked(readFile).mockResolvedValueOnce('# Plan' as never).mockRejectedValueOnce(new Error('missing'));

    const result = await validatePlanArtifacts('/feature');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ escapeHatchReason: 'factory-rejected' });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(2);
  });

  it('rejects research missing edge case', async () => {
    vi.mocked(readFile).mockResolvedValueOnce('# Plan' as never).mockResolvedValueOnce('research: missing' as never);

    const result = await validatePlanArtifacts('/feature');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: 'escape-hatch' });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(2);
  });
});
