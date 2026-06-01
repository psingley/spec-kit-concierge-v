import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import { ensureRepoCloned, localRepoPath } from './cloneRepo';

const documentsRoot = path.join('/Users', 'dev', 'Documents');

afterEach(() => {
  delete process.env.CONCIERGE_TEST_ENSURE_LOCAL_ADAPTER;
});

describe('localRepoPath', () => {
  it('builds the clone target with path.join under Documents/Concierge/<owner>/<name>', () => {
    expect(localRepoPath(documentsRoot, 'psingley', 'workcells')).toBe(
      path.join(documentsRoot, 'Concierge', 'psingley', 'workcells')
    );
  });

  it('never produces a literal POSIX-slug path on win32-style roots', () => {
    const winRoot = 'C:\\Users\\dev\\Documents';
    const target = localRepoPath(winRoot, 'psingley', 'workcells', path.win32);
    // path.win32.join joins with backslashes — assert no path was slug-concatenated.
    expect(target).toBe(path.win32.join(winRoot, 'Concierge', 'psingley', 'workcells'));
    expect(target.split(path.win32.sep)).toContain('Concierge');
  });
});

describe('ensureRepoCloned', () => {
  const cloneUrl = 'https://github.com/psingley/workcells.git';

  it('clones into the resolved Documents path when no local dir exists', async () => {
    const runGit = vi.fn(async () => '');
    const dirExists = vi.fn(async () => false);
    const ensureDir = vi.fn(async () => undefined);
    const result = await ensureRepoCloned(
      { owner: 'psingley', name: 'workcells', cloneUrl, documentsRoot },
      { runGit, dirExists, ensureDir }
    );
    expect(ensureDir).toHaveBeenCalledWith(path.join(documentsRoot, 'Concierge', 'psingley'));
    const expected = path.join(documentsRoot, 'Concierge', 'psingley', 'workcells');
    expect(result).toEqual({ localPath: expected, cloned: true });
    expect(runGit).toHaveBeenCalledTimes(1);
    expect(runGit).toHaveBeenCalledWith(path.join(documentsRoot, 'Concierge', 'psingley'), ['clone', cloneUrl, expected]);
  });

  it('does not clone when an existing valid git repo is present', async () => {
    const runGit = vi.fn(async () => '.git');
    const dirExists = vi.fn(async () => true);
    const expected = path.join(documentsRoot, 'Concierge', 'psingley', 'workcells');
    const result = await ensureRepoCloned(
      { owner: 'psingley', name: 'workcells', cloneUrl, documentsRoot },
      { runGit, dirExists }
    );
    expect(result).toEqual({ localPath: expected, cloned: false });
    // rev-parse --git-dir validates the existing directory; no clone is issued.
    expect(runGit).toHaveBeenCalledWith(expected, ['rev-parse', '--git-dir']);
    expect(runGit).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining(['clone'])
    );
  });

  it('resolves a fixture local path from the test adapter without cloning', async () => {
    await withTempDir(async (dir) => {
      const adapterPath = path.join(dir, 'ensure-local.json');
      await writeFile(adapterPath, JSON.stringify({ 'psingley/workcells': '/fixture/local/workcells' }), 'utf8');
      process.env.CONCIERGE_TEST_ENSURE_LOCAL_ADAPTER = adapterPath;

      const runGit = vi.fn(async () => '');
      const dirExists = vi.fn(async () => false);
      const result = await ensureRepoCloned(
        { owner: 'psingley', name: 'workcells', cloneUrl, documentsRoot },
        { runGit, dirExists }
      );
      expect(result).toEqual({ localPath: '/fixture/local/workcells', cloned: false });
      expect(runGit).not.toHaveBeenCalled();
    });
  });

  it('errors when an existing directory is not a git repo', async () => {
    const runGit = vi.fn(async () => {
      throw new Error('fatal: not a git repository');
    });
    const dirExists = vi.fn(async () => true);
    await expect(
      ensureRepoCloned({ owner: 'psingley', name: 'workcells', cloneUrl, documentsRoot }, { runGit, dirExists })
    ).rejects.toThrow(/not a git repository/i);
  });
});
