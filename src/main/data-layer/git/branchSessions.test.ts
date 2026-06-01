import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
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

const writeSpecMd = async (repositoryPath: string, featureSlug: string): Promise<string> => {
  const relativePath = path.join('specs', featureSlug, 'spec.md');
  await mkdir(path.join(repositoryPath, 'specs', featureSlug), { recursive: true });
  await writeFile(path.join(repositoryPath, relativePath), '# Spec\n');
  return relativePath;
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

  // Real historical Concierge sessions live on main. These trailers MUST NOT
  // leak into feature branches that merely sit on top of main.
  await commitWithTrailer(repositoryPath, 'main-session.md', 'specify', 'pass');

  // Legacy spec/draft-* branch with a branch-unique specify:pass session.
  await git(repositoryPath, ['checkout', '-b', 'spec/draft-legacy']);
  await commitWithTrailer(repositoryPath, 'legacy-spec.md', 'specify', 'pass');

  // Spec-kit NNN-slug feature branch with a branch-unique specify:pass session.
  await git(repositoryPath, ['checkout', 'main']);
  await git(repositoryPath, ['checkout', '-b', '014-remove-faux-controls']);
  await commitWithTrailer(repositoryPath, 'feature-spec.md', 'specify', 'pass');

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

  it(
    "does not leak main's trailers into a branch with zero unique commits",
    async () => {
      await withTempDir(async (directory) => {
        const repositoryPath = await createFixture(directory);
        // A feature branch sitting exactly on main: 0 unique commits, no spec.md.
        await git(repositoryPath, ['checkout', '-b', '015-no-unique-commits']);
        await git(repositoryPath, ['checkout', 'main']);

        const sessions = await listBranchSessions(repositoryPath);
        const bare = sessions.find((session) => session.branch === '015-no-unique-commits');

        // Inherited main trailers must not make it complete. With no spec.md and no
        // unique trailer the branch is not a resumable session at all.
        expect(bare).toBeUndefined();
      });
    },
    gitFixtureTimeoutMs
  );

  it(
    'reports a branch-unique specify:pass trailer as complete',
    async () => {
      await withTempDir(async (directory) => {
        const repositoryPath = await createFixture(directory);
        const sessions = await listBranchSessions(repositoryPath);

        const specKit = sessions.find((session) => session.branch === '014-remove-faux-controls');
        expect(specKit?.restoredStates.specify).toBe('complete');
      });
    },
    gitFixtureTimeoutMs
  );

  it(
    'reports a branch with a working-tree spec.md but no pass trailer as pending (dirty/in-progress)',
    async () => {
      await withTempDir(async (directory) => {
        const repositoryPath = await createFixture(directory);
        await git(repositoryPath, ['checkout', '-b', '016-dirty-in-progress']);
        // Uncommitted spec.md only — work began but no Step Commit yet.
        await writeSpecMd(repositoryPath, '016-dirty-in-progress');
        await git(repositoryPath, ['checkout', '-f', 'main']);

        const sessions = await listBranchSessions(repositoryPath);
        const dirty = sessions.find((session) => session.branch === '016-dirty-in-progress');

        expect(dirty).toBeDefined();
        expect(dirty?.restoredStates.specify).toBe('pending');
      });
    },
    gitFixtureTimeoutMs
  );

  it(
    'reports a branch with a committed-unique spec.md but no pass trailer as pending',
    async () => {
      await withTempDir(async (directory) => {
        const repositoryPath = await createFixture(directory);
        await git(repositoryPath, ['checkout', '-b', '017-committed-no-trailer']);
        const relativePath = await writeSpecMd(repositoryPath, '017-committed-no-trailer');
        await git(repositoryPath, ['add', relativePath]);
        await git(repositoryPath, ['commit', '-m', 'add spec without trailer']);
        await git(repositoryPath, ['checkout', 'main']);

        const sessions = await listBranchSessions(repositoryPath);
        const inProgress = sessions.find((session) => session.branch === '017-committed-no-trailer');

        expect(inProgress).toBeDefined();
        expect(inProgress?.restoredStates.specify).toBe('pending');
      });
    },
    gitFixtureTimeoutMs
  );

  it(
    'reports a bare branch with no spec.md and no unique trailer as not a session',
    async () => {
      await withTempDir(async (directory) => {
        const repositoryPath = await createFixture(directory);
        await git(repositoryPath, ['checkout', '-b', '018-bare-branch']);
        await writeFile(path.join(repositoryPath, 'unrelated.txt'), 'noise\n');
        await git(repositoryPath, ['add', 'unrelated.txt']);
        await git(repositoryPath, ['commit', '-m', 'unrelated change, no spec']);
        await git(repositoryPath, ['checkout', 'main']);

        const sessions = await listBranchSessions(repositoryPath);
        const bare = sessions.find((session) => session.branch === '018-bare-branch');

        expect(bare).toBeUndefined();
      });
    },
    gitFixtureTimeoutMs
  );
});
