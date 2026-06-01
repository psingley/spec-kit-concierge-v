import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import type { ConciergeStepCommit } from '../../domain/factories/types';
import { withTempDir } from '../../../test/tempDir';
import { commitWithTrailer, GitCommandError, runGit } from './gitCommand';

const execFileAsync = promisify(execFile);
const gitFixtureTimeoutMs = 60_000;

const git = async (cwd: string, args: string[]): Promise<void> => {
  await execFileAsync('git', args, { cwd });
};

const createRepository = async (directory: string): Promise<void> => {
  await git(directory, ['init', '--initial-branch', 'main']);
  await git(directory, ['config', 'user.email', 'concierge@example.com']);
  await git(directory, ['config', 'user.name', 'Concierge Test']);
  await writeFile(path.join(directory, 'seed.txt'), 'seed');
  await git(directory, ['add', '.']);
  await git(directory, ['commit', '-m', 'initial']);
};

const countCommits = async (directory: string): Promise<number> => {
  const output = await runGit(directory, ['rev-list', '--count', 'HEAD']);
  return Number.parseInt(output, 10);
};

describe('commitWithTrailer idempotency', () => {
  it('adopts the existing HEAD commit when nothing is staged and HEAD already carries the matching trailer', async () => {
    await withTempDir(async (directory) => {
      await createRepository(directory);

      // Simulate an agent (Copilot) committing the artifacts WITH the trailer
      // before Concierge's own after-hook runs.
      await writeFile(path.join(directory, 'spec.md'), 'spec contents');
      await git(directory, ['add', '--', 'spec.md']);
      await git(directory, [
        'commit',
        '-m',
        'feat: specify\n\nConcierge-Step: specify:pass'
      ]);

      const expectedSha = await runGit(directory, ['rev-parse', 'HEAD']);
      const commitsBefore = await countCommits(directory);

      const candidate: ConciergeStepCommit = {
        step: 'specify',
        status: 'pass',
        files: ['spec.md'],
        message: 'feat: specify'
      };

      const result = await commitWithTrailer(directory, candidate);

      expect(result).toEqual({
        commitSha: expectedSha,
        trailer: 'Concierge-Step: specify:pass'
      });
      // No second commit was created.
      expect(await countCommits(directory)).toBe(commitsBefore);
    });
  }, gitFixtureTimeoutMs);

  it('commits normally when files are staged', async () => {
    await withTempDir(async (directory) => {
      await createRepository(directory);

      await writeFile(path.join(directory, 'spec.md'), 'spec contents');
      const commitsBefore = await countCommits(directory);

      const candidate: ConciergeStepCommit = {
        step: 'specify',
        status: 'pass',
        files: ['spec.md'],
        message: 'feat: specify'
      };

      const result = await commitWithTrailer(directory, candidate);

      expect(result.trailer).toBe('Concierge-Step: specify:pass');
      expect(await countCommits(directory)).toBe(commitsBefore + 1);
      expect(result.commitSha).toBe(await runGit(directory, ['rev-parse', 'HEAD']));

      const message = await runGit(directory, ['log', '-1', '--format=%B']);
      expect(message).toContain('Concierge-Step: specify:pass');
    });
  }, gitFixtureTimeoutMs);

  it('throws when nothing is staged and HEAD has no matching Concierge-Step trailer', async () => {
    await withTempDir(async (directory) => {
      await createRepository(directory);

      const candidate: ConciergeStepCommit = {
        step: 'specify',
        status: 'pass',
        files: [],
        message: 'feat: specify'
      };

      await expect(commitWithTrailer(directory, candidate)).rejects.toBeInstanceOf(
        GitCommandError
      );
    });
  }, gitFixtureTimeoutMs);

  it('makes an empty commit for analyze when allowEmptyCommit is set even with nothing staged', async () => {
    await withTempDir(async (directory) => {
      await createRepository(directory);
      const commitsBefore = await countCommits(directory);

      const candidate: ConciergeStepCommit = {
        step: 'analyze',
        status: 'pass',
        files: [],
        message: 'chore: analyze',
        allowEmptyCommit: true
      };

      const result = await commitWithTrailer(directory, candidate);

      expect(result.trailer).toBe('Concierge-Step: analyze:pass');
      expect(await countCommits(directory)).toBe(commitsBefore + 1);

      const message = await runGit(directory, ['log', '-1', '--format=%B']);
      expect(message).toContain('Concierge-Step: analyze:pass');
    });
  }, gitFixtureTimeoutMs);
});
