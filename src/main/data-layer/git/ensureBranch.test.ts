import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import { ensureBranch } from './ensureBranch';
import { runGit } from './gitCommand';

const execFileAsync = promisify(execFile);
const gitFixtureTimeoutMs = 60_000;

const git = async (cwd: string, args: string[]): Promise<void> => {
  await execFileAsync('git', args, { cwd });
};

// A clone with one commit on `main`, then detached at that commit. Mirrors a
// session worktree left on a DETACHED HEAD after spec-kit's git.feature hook
// did NOT run (the Bug 25 condition).
const createDetachedRepo = async (directory: string): Promise<string> => {
  await git(directory, ['init', '--initial-branch', 'main']);
  await git(directory, ['config', 'user.email', 'concierge@example.com']);
  await git(directory, ['config', 'user.name', 'Concierge Test']);
  await writeFile(path.join(directory, 'spec.md'), '# spec');
  await git(directory, ['add', 'spec.md']);
  await git(directory, ['commit', '-m', 'specify']);
  // Detach at HEAD.
  await git(directory, ['checkout', '--detach', 'HEAD']);
  return directory;
};

describe('ensureBranch', () => {
  it('creates and switches to <branchName> when the worktree is on a detached HEAD', async () => {
    await withTempDir(async (directory) => {
      const repositoryPath = await createDetachedRepo(directory);
      const detachedSha = await runGit(repositoryPath, ['rev-parse', 'HEAD']);

      const result = await ensureBranch(repositoryPath, '0012-remove-faux-traffic-lights');

      expect(result).toBe('0012-remove-faux-traffic-lights');
      await expect(runGit(repositoryPath, ['branch', '--show-current'])).resolves.toBe(
        '0012-remove-faux-traffic-lights'
      );
      // No data moved: the new branch points at the same specify commit.
      await expect(runGit(repositoryPath, ['rev-parse', 'HEAD'])).resolves.toBe(detachedSha);
    });
  }, gitFixtureTimeoutMs);

  it('is a no-op when already on <branchName> and returns it', async () => {
    await withTempDir(async (directory) => {
      await git(directory, ['init', '--initial-branch', 'main']);
      await git(directory, ['config', 'user.email', 'concierge@example.com']);
      await git(directory, ['config', 'user.name', 'Concierge Test']);
      await writeFile(path.join(directory, 'spec.md'), '# spec');
      await git(directory, ['add', 'spec.md']);
      await git(directory, ['commit', '-m', 'specify']);
      await git(directory, ['checkout', '-b', '0012-feature']);

      const result = await ensureBranch(directory, '0012-feature');

      expect(result).toBe('0012-feature');
      await expect(runGit(directory, ['branch', '--show-current'])).resolves.toBe('0012-feature');
    });
  }, gitFixtureTimeoutMs);

  it('leaves a different non-detached branch in place and returns it (no force)', async () => {
    await withTempDir(async (directory) => {
      await git(directory, ['init', '--initial-branch', 'main']);
      await git(directory, ['config', 'user.email', 'concierge@example.com']);
      await git(directory, ['config', 'user.name', 'Concierge Test']);
      await writeFile(path.join(directory, 'spec.md'), '# spec');
      await git(directory, ['add', 'spec.md']);
      await git(directory, ['commit', '-m', 'specify']);
      // On `main`, not detached. Asking for a different branch must not move us.
      const result = await ensureBranch(directory, '0012-feature');

      expect(result).toBe('main');
      await expect(runGit(directory, ['branch', '--show-current'])).resolves.toBe('main');
    });
  }, gitFixtureTimeoutMs);

  it('on collision (branch already exists) creates a unique-suffixed branch and never clobbers/throws', async () => {
    await withTempDir(async (directory) => {
      const repositoryPath = await createDetachedRepo(directory);
      // Simulate a prior session's branch of the same name already existing in
      // this clone (the gotcha: `git checkout -b` fails when it exists).
      await git(repositoryPath, ['branch', '0012-feature']);
      const existingSha = await runGit(repositoryPath, ['rev-parse', '0012-feature']);

      const result = await ensureBranch(repositoryPath, '0012-feature');

      // Ended on SOME real, non-detached branch...
      expect(result).not.toBe('');
      await expect(runGit(repositoryPath, ['branch', '--show-current'])).resolves.toBe(result);
      // ...that is NOT the pre-existing branch (we did not clobber/move it).
      expect(result).not.toBe('0012-feature');
      await expect(runGit(repositoryPath, ['rev-parse', '0012-feature'])).resolves.toBe(existingSha);
    });
  }, gitFixtureTimeoutMs);
});
