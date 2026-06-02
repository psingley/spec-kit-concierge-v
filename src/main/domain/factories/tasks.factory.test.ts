import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { validateTasksArtifacts } from './tasks.factory';

const fsMocks = vi.hoisted(() => ({ readFile: vi.fn() }));

vi.mock('node:fs/promises', () => ({
  default: { readFile: fsMocks.readFile },
  readFile: fsMocks.readFile
}));

describe('validateTasksArtifacts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns commit candidate for valid tasks markdown', async () => {
    vi.mocked(readFile).mockResolvedValue('# Tasks\n- [ ] T001' as never);

    const result = await validateTasksArtifacts('/feature');

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ commit: { step: 'tasks', files: ['tasks.md'], message: 'Concierge tasks step' } });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(1);
  });

  it('rejects missing required tasks artifact', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('missing'));

    const result = await validateTasksArtifacts('/feature');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ escapeHatchReason: 'factory-rejected' });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(1);
  });

  it('accepts realistic tasks markdown containing partial as ordinary prose', async () => {
    vi.mocked(readFile).mockResolvedValue(`# Tasks

Notes for partial-artifact-set resume handling.

- [ ] T001 [P] Restore the workflow state from persisted artifacts.
- [ ] T002 Continue the bounded validation pass.` as never);

    const result = await validateTasksArtifacts('/feature');

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ commit: { step: 'tasks', files: ['tasks.md'] } });
    expect(vi.mocked(readFile)).toHaveBeenCalledWith(expect.stringContaining('tasks.md'), 'utf8');
  });

  it('rejects empty tasks markdown', async () => {
    vi.mocked(readFile).mockResolvedValue('   ' as never);

    const result = await validateTasksArtifacts('/feature');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: 'escape-hatch' });
  });

  it('rejects tasks markdown with frontmatter key injection', async () => {
    vi.mocked(readFile).mockResolvedValue('---\ntoken: secret\n---\n# Tasks\n- [ ] T001 Task' as never);

    const result = await validateTasksArtifacts('/feature');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: 'escape-hatch' });
  });

  it('rejects tasks markdown with git conflict markers', async () => {
    vi.mocked(readFile).mockResolvedValue('# Tasks\n<<<<<<< HEAD\n- [ ] T001 Task' as never);

    const result = await validateTasksArtifacts('/feature');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: 'escape-hatch' });
  });
});
