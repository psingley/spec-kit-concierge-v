import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import { readResumeSpec } from './resumeSpec';

const execFileAsync = promisify(execFile);
const gitFixtureTimeoutMs = 60_000;

const git = async (cwd: string, args: string[]): Promise<void> => {
  await execFileAsync('git', args, { cwd });
};

// A worktree fixture: a git repo with .specify/feature.json pointing at a feature
// dir that contains a committed spec.md. Reads run against THIS path (in place).
const createWorktree = async (directory: string, featureDir: string, specBody: string): Promise<void> => {
  await git(directory, ['init', '--initial-branch', 'main']);
  await git(directory, ['config', 'user.email', 'concierge@example.com']);
  await git(directory, ['config', 'user.name', 'Concierge Test']);
  await mkdir(path.join(directory, '.specify'), { recursive: true });
  await writeFile(path.join(directory, '.specify', 'feature.json'), JSON.stringify({ feature_directory: featureDir }));
  await mkdir(path.join(directory, featureDir), { recursive: true });
  await writeFile(path.join(directory, featureDir, 'spec.md'), specBody);
  await git(directory, ['add', '.']);
  await git(directory, ['commit', '-m', 'spec']);
};

describe('readResumeSpec', () => {
  it('reads the committed spec.md from the worktree feature dir + HEAD sha', async () => {
    await withTempDir(async (directory) => {
      await createWorktree(directory, 'specs/001-thing', '# Spec\n\nThe body');

      const result = await readResumeSpec(directory);

      expect(result.specMarkdown).toBe('# Spec\n\nThe body');
      expect(result.specCommitSha).toMatch(/^[0-9a-f]{40}$/);
    });
  }, gitFixtureTimeoutMs);

  it('returns graceful empty when .specify/feature.json is missing', async () => {
    await withTempDir(async (directory) => {
      await git(directory, ['init', '--initial-branch', 'main']);
      await git(directory, ['config', 'user.email', 'concierge@example.com']);
      await git(directory, ['config', 'user.name', 'Concierge Test']);
      await writeFile(path.join(directory, 'keep.txt'), 'x');
      await git(directory, ['add', '.']);
      await git(directory, ['commit', '-m', 'init']);

      const result = await readResumeSpec(directory);

      expect(result.specMarkdown).toBe('');
      // HEAD is readable even though there is no spec.
      expect(result.specCommitSha).toMatch(/^[0-9a-f]{40}$/);
    });
  }, gitFixtureTimeoutMs);

  it('returns empty spec when feature.json exists but spec.md is absent', async () => {
    await withTempDir(async (directory) => {
      await git(directory, ['init', '--initial-branch', 'main']);
      await git(directory, ['config', 'user.email', 'concierge@example.com']);
      await git(directory, ['config', 'user.name', 'Concierge Test']);
      await mkdir(path.join(directory, '.specify'), { recursive: true });
      await writeFile(path.join(directory, '.specify', 'feature.json'), JSON.stringify({ feature_directory: 'specs/002-thing' }));
      await git(directory, ['add', '.']);
      await git(directory, ['commit', '-m', 'manifest only']);

      const result = await readResumeSpec(directory);

      expect(result.specMarkdown).toBe('');
      expect(result.specCommitSha).toMatch(/^[0-9a-f]{40}$/);
    });
  }, gitFixtureTimeoutMs);

  it('returns null sha when the worktree is not a git repo (unreadable HEAD)', async () => {
    await withTempDir(async (directory) => {
      const result = await readResumeSpec(directory);
      expect(result.specMarkdown).toBe('');
      expect(result.specCommitSha).toBeNull();
    });
  }, gitFixtureTimeoutMs);
});
