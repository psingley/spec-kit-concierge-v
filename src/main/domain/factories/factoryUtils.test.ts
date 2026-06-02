import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  commitCandidate,
  factoryEscape,
  hasGitConflictMarkers,
  readRequiredArtifact,
  validateMarkdownContents,
  validateRequiredMarkdown
} from './factoryUtils';

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

  it('rejects deterministic invalid markdown and allows ordinary prose words', async () => {
    mockedReadFile
      .mockRejectedValueOnce(new Error('missing'))
      .mockResolvedValueOnce('   ' as never)
      .mockResolvedValueOnce('---\ntoken: secret\n---\n# Tasks' as never)
      .mockResolvedValueOnce('# Tasks\n<<<<<<< HEAD\nbody' as never)
      .mockResolvedValueOnce('# Tasks\nThe draft mentions partial and malformed artifacts as prose.' as never);

    const missing = await validateRequiredMarkdown('tasks', '/feature');
    const empty = await validateRequiredMarkdown('tasks', '/feature');
    const frontmatter = await validateRequiredMarkdown('tasks', '/feature');
    const conflict = await validateRequiredMarkdown('tasks', '/feature');
    const prose = await validateRequiredMarkdown('tasks', '/feature');

    expect(missing).toMatchObject({ ok: false, escapeHatchReason: 'factory-rejected' });
    expect(empty).toMatchObject({ ok: false, escapeHatchReason: 'factory-rejected' });
    expect(frontmatter).toMatchObject({ ok: false, escapeHatchReason: 'factory-rejected' });
    expect(conflict).toMatchObject({ ok: false, escapeHatchReason: 'factory-rejected' });
    expect(prose).toBeUndefined();
    expect(validateMarkdownContents('# Notes\nA malformed partial artifact was discussed.')).toBeUndefined();
    expect(hasGitConflictMarkers('# Notes\n=======\nbody')).toBe(true);
  });

  it('creates commit candidates with step-specific edge cases', () => {
    const plan = commitCandidate('plan', ['plan.md', 'research.md'], { contextFilePath: 'CONTEXT.md' });
    const analyze = commitCandidate('analyze', []);

    expect(plan.files).toEqual(['plan.md', 'research.md', 'CONTEXT.md']);
    expect(analyze.files).toEqual([]);
    expect(analyze.allowEmptyCommit).toBe(true);
    expect(plan.message).toBe('Concierge plan step');
  });

  it('prefixes commit files with the feature-dir-relative path when featureDir is a subdir', () => {
    const specify = commitCandidate('specify', ['spec.md'], {
      repositoryPath: '/repo',
      featureDir: '/repo/specs/0012-remove-faux-controls'
    });

    expect(specify.files).toEqual(['specs/0012-remove-faux-controls/spec.md']);
  });

  it('keeps bare commit files when featureDir equals repositoryPath (no regression)', () => {
    const tasks = commitCandidate('tasks', ['tasks.md'], {
      repositoryPath: '/repo',
      featureDir: '/repo'
    });

    expect(tasks.files).toEqual(['tasks.md']);
  });

  it('keeps bare commit files when repositoryPath/featureDir are absent (backward compatible)', () => {
    const tasks = commitCandidate('tasks', ['tasks.md']);

    expect(tasks.files).toEqual(['tasks.md']);
  });

  it('prefixes the plan context file alongside required files for a subdir featureDir', () => {
    const plan = commitCandidate('plan', ['plan.md', 'research.md'], {
      repositoryPath: '/repo',
      featureDir: '/repo/specs/0012-x',
      contextFilePath: 'CONTEXT.md'
    });

    expect(plan.files).toEqual([
      'specs/0012-x/plan.md',
      'specs/0012-x/research.md',
      'specs/0012-x/CONTEXT.md'
    ]);
  });

  it('does not re-prefix analyze remediation files that are already repo-root-relative', () => {
    const analyze = commitCandidate('analyze', ['specs/0012-x/spec.md'], {
      repositoryPath: '/repo',
      featureDir: '/repo/specs/0012-x'
    });

    expect(analyze.files).toEqual(['specs/0012-x/spec.md']);
  });
});
