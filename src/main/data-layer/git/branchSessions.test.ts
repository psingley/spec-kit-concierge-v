import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import { listBranchSessions } from './branchSessions';

const execFileAsync = promisify(execFile);
const gitFixtureTimeoutMs = 60_000;

const git = async (cwd: string, args: string[]): Promise<void> => {
  await execFileAsync('git', args, { cwd });
};

const commitWithTrailer = async (
  repositoryPath: string,
  name: string,
  step: string,
  status: string
): Promise<void> => {
  await writeFile(path.join(repositoryPath, name), `# ${name}\n`);
  await git(repositoryPath, ['add', name]);
  await git(repositoryPath, ['commit', '-m', `Concierge ${step} step\n\nConcierge-Step: ${step}:${status}`]);
};

const createFixture = async (directory: string): Promise<string> => {
  const repositoryPath = path.join(directory, 'work');
  await git(directory, ['init', repositoryPath]);
  await git(repositoryPath, ['checkout', '-b', 'main']);
  await git(repositoryPath, ['config', 'user.email', 'concierge@example.com']);
  await git(repositoryPath, ['config', 'user.name', 'Concierge Test']);
  await writeFile(path.join(repositoryPath, 'initial.txt'), 'initial');
  await git(repositoryPath, ['add', 'initial.txt']);
  await git(repositoryPath, ['commit', '-m', 'initial']);

  // Legacy spec/draft-* branch with a specify:pass session.
  await git(repositoryPath, ['checkout', '-b', 'spec/draft-legacy']);
  await commitWithTrailer(repositoryPath, 'spec.md', 'specify', 'pass');

  // Spec-kit NNN-slug feature branch with a specify:pass session.
  await git(repositoryPath, ['checkout', 'main']);
  await git(repositoryPath, ['checkout', '-b', '014-remove-faux-controls']);
  await commitWithTrailer(repositoryPath, 'spec.md', 'specify', 'pass');

  await git(repositoryPath, ['checkout', 'main']);
  return repositoryPath;
};

describe('listBranchSessions', () => {
  it(
    'includes spec-kit NNN-slug feature branches with a specify:pass trailer',
    async () => {
      await withTempDir(async (directory) => {
        const repositoryPath = await createFixture(directory);
        const sessions = await listBranchSessions(repositoryPath);

        const specKit = sessions.find((session) => session.branch === '014-remove-faux-controls');
        expect(specKit).toBeDefined();
        expect(specKit?.restoredStates.specify).toBe('complete');
        expect(specKit?.label).toBe('014-remove-faux-controls');
      });
    },
    gitFixtureTimeoutMs
  );

  it(
    'keeps legacy spec/* branches and strips the spec/ prefix from their label',
    async () => {
      await withTempDir(async (directory) => {
        const repositoryPath = await createFixture(directory);
        const sessions = await listBranchSessions(repositoryPath);

        const legacy = sessions.find((session) => session.branch === 'spec/draft-legacy');
        expect(legacy).toBeDefined();
        expect(legacy?.label).toBe('draft-legacy');
        expect(legacy?.restoredStates.specify).toBe('complete');
      });
    },
    gitFixtureTimeoutMs
  );

  it(
    'excludes the default branch from resumable sessions',
    async () => {
      await withTempDir(async (directory) => {
        const repositoryPath = await createFixture(directory);
        const sessions = await listBranchSessions(repositoryPath);

        expect(sessions.some((session) => session.branch === 'main')).toBe(false);
      });
    },
    gitFixtureTimeoutMs
  );
});
