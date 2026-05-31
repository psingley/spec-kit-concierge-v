import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import { GitCommandError } from './gitCommand';
import { readUncommittedPaths } from './uncommittedPaths';

const execFileAsync = promisify(execFile);
const gitFixtureTimeoutMs = 60_000;

const git = async (cwd: string, args: string[]): Promise<void> => {
  await execFileAsync('git', args, { cwd });
};

const createRepository = async (directory: string): Promise<void> => {
  await git(directory, ['init', '--initial-branch', 'main']);
  await git(directory, ['config', 'user.email', 'concierge@example.com']);
  await git(directory, ['config', 'user.name', 'Concierge Test']);
  await writeFile(path.join(directory, 'tracked.txt'), 'tracked');
  await writeFile(path.join(directory, 'unrelated.txt'), 'unrelated');
  await git(directory, ['add', '.']);
  await git(directory, ['commit', '-m', 'initial']);
};

describe('readUncommittedPaths', () => {
  it('reports changes in caller-provided paths', async () => {
    await withTempDir(async (directory) => {
      await createRepository(directory);
      await writeFile(path.join(directory, 'tracked.txt'), 'changed');

      await expect(readUncommittedPaths(directory, ['tracked.txt'])).resolves.toEqual({
        hasUncommittedChanges: true,
        changedPaths: ['tracked.txt']
      });
    });
  }, gitFixtureTimeoutMs);

  it('treats unrelated dirty paths as non-matches', async () => {
    await withTempDir(async (directory) => {
      await createRepository(directory);
      await writeFile(path.join(directory, 'unrelated.txt'), 'changed');

      await expect(readUncommittedPaths(directory, ['tracked.txt'])).resolves.toEqual({
        hasUncommittedChanges: false,
        changedPaths: []
      });
    });
  }, gitFixtureTimeoutMs);

  it('reports clean path sets', async () => {
    await withTempDir(async (directory) => {
      await createRepository(directory);

      await expect(readUncommittedPaths(directory, ['tracked.txt'])).resolves.toEqual({
        hasUncommittedChanges: false,
        changedPaths: []
      });
    });
  }, gitFixtureTimeoutMs);

  it('surfaces git failures explicitly', async () => {
    await withTempDir(async (directory) => {
      await expect(readUncommittedPaths(directory, ['tracked.txt'])).rejects.toBeInstanceOf(
        GitCommandError
      );
    });
  }, gitFixtureTimeoutMs);
});
