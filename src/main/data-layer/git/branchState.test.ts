import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import { GitCommandError } from './gitCommand';
import { readBranchState } from './branchState';

const execFileAsync = promisify(execFile);
const gitFixtureTimeoutMs = 60_000;

const git = async (cwd: string, args: string[]): Promise<void> => {
  await execFileAsync('git', args, { cwd });
};

const commitFile = async (repositoryPath: string, name: string, contents: string): Promise<void> => {
  await writeFile(path.join(repositoryPath, name), contents);
  await git(repositoryPath, ['add', name]);
  await git(repositoryPath, ['commit', '-m', `commit ${name}`]);
};

const createAheadBehindFixture = async (directory: string): Promise<string> => {
  const remotePath = path.join(directory, 'remote.git');
  const workPath = path.join(directory, 'work');
  const otherPath = path.join(directory, 'other');

  await git(directory, ['init', '--bare', remotePath]);
  await git(directory, ['clone', remotePath, workPath]);
  await git(workPath, ['checkout', '-b', 'main']);
  await git(workPath, ['config', 'user.email', 'concierge@example.com']);
  await git(workPath, ['config', 'user.name', 'Concierge Test']);
  await commitFile(workPath, 'initial.txt', 'initial');
  await git(workPath, ['push', '-u', 'origin', 'main']);

  await git(directory, ['clone', remotePath, otherPath]);
  await git(otherPath, ['config', 'user.email', 'concierge@example.com']);
  await git(otherPath, ['config', 'user.name', 'Concierge Test']);
  await commitFile(otherPath, 'remote.txt', 'remote');
  await git(otherPath, ['push']);

  await commitFile(workPath, 'local.txt', 'local');
  await git(workPath, ['fetch', 'origin']);
  await writeFile(path.join(workPath, 'dirty.txt'), 'dirty');

  return workPath;
};

describe('readBranchState', () => {
  it('reports current branch, ahead count, behind count, and dirty state', async () => {
    await withTempDir(async (directory) => {
      const repositoryPath = await createAheadBehindFixture(directory);

      await expect(readBranchState(repositoryPath)).resolves.toEqual({
        branch: 'main',
        ahead: 1,
        behind: 1,
        dirty: true
      });
    });
  }, gitFixtureTimeoutMs);

  it('reports a clean working tree', async () => {
    await withTempDir(async (directory) => {
      await git(directory, ['init', '--initial-branch', 'main']);
      await git(directory, ['config', 'user.email', 'concierge@example.com']);
      await git(directory, ['config', 'user.name', 'Concierge Test']);
      await commitFile(directory, 'clean.txt', 'clean');

      await expect(readBranchState(directory)).resolves.toMatchObject({
        branch: 'main',
        dirty: false
      });
    });
  }, gitFixtureTimeoutMs);

  it('surfaces git failures explicitly', async () => {
    await withTempDir(async (directory) => {
      await expect(readBranchState(directory)).rejects.toBeInstanceOf(GitCommandError);
    });
  }, gitFixtureTimeoutMs);
});
