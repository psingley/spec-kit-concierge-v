import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { commitCandidate, factoryEscape, readRequiredArtifact, validateRequiredMarkdown } from './factoryUtils';

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  default: { readFile: fsMocks.readFile },
  readFile: fsMocks.readFile
}));

const mockedReadFile = vi.mocked(readFile);

describe('factoryUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates default factory escape results', () => {
    const result = factoryEscape();

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: 'escape-hatch' });
    expect(result).toMatchObject({ escapeHatchReason: 'factory-rejected' });
  });

  it('reads required artifacts from feature directories', async () => {
    mockedReadFile.mockResolvedValue('# Spec' as never);

    const result = await readRequiredArtifact('/feature', 'spec.md');

    expect(result).toBe('# Spec');
    expect(mockedReadFile).toHaveBeenCalledWith(expect.stringContaining('/feature/spec.md'), 'utf8');
    expect(mockedReadFile).toHaveBeenCalledTimes(1);
  });

  it('returns undefined for missing required artifacts', async () => {
    mockedReadFile.mockRejectedValue(new Error('missing'));

    const result = await readRequiredArtifact('/feature', 'missing.md');

    expect(result).toBeUndefined();
    expect(mockedReadFile).toHaveBeenCalledTimes(1);
    expect(mockedReadFile.mock.calls[0]?.[0]).toContain('missing.md');
  });

  it('rejects missing, hostile, and partial markdown', async () => {
    mockedReadFile.mockResolvedValueOnce('   ' as never).mockResolvedValueOnce('bad-task' as never).mockResolvedValueOnce('partial' as never);

    const missing = await validateRequiredMarkdown('tasks', '/feature', /bad-task/i, /partial/i);
    const hostile = await validateRequiredMarkdown('tasks', '/feature', /bad-task/i, /partial/i);
    const partial = await validateRequiredMarkdown('tasks', '/feature', /bad-task/i, /partial/i);

    expect(missing).toMatchObject({ ok: false, escapeHatchReason: 'factory-rejected' });
    expect(hostile).toMatchObject({ ok: false, escapeHatchReason: 'factory-rejected' });
    expect(partial).toMatchObject({ ok: false, escapeHatchReason: 'factory-rejected' });
  });

  it('creates commit candidates with step-specific edge cases', () => {
    const plan = commitCandidate('plan', ['plan.md', 'research.md'], { contextFilePath: 'CONTEXT.md' });
    const analyze = commitCandidate('analyze', []);

    expect(plan.files).toEqual(['plan.md', 'research.md', 'CONTEXT.md']);
    expect(analyze.files).toEqual([]);
    expect(analyze.allowEmptyCommit).toBe(true);
    expect(plan.message).toBe('Concierge plan step');
  });
});
