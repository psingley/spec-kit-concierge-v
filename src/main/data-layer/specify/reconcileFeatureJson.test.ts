import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it, vi } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import { commitWithTrailer } from '../git/gitCommand';
import { resolveFeatureDir } from './featureDir';
import {
  decideSpecifyFeatureDirectory,
  decideSpecifyFeatureJsonReconciliation,
  reconcileSpecifyFeatureJson
} from './reconcileFeatureJson';

const execFileAsync = promisify(execFile);
const gitFixtureTimeoutMs = 60_000;

const git = async (repositoryPath: string, args: string[]): Promise<void> => {
  await execFileAsync('git', args, { cwd: repositoryPath });
};

const gitOutput = async (repositoryPath: string, args: string[]): Promise<string> => {
  const { stdout } = await execFileAsync('git', args, { cwd: repositoryPath });
  return stdout.trim();
};

const createRepository = async (directory: string): Promise<void> => {
  await git(directory, ['init', '--initial-branch', 'main']);
  await git(directory, ['config', 'user.email', 'concierge@example.com']);
  await git(directory, ['config', 'user.name', 'Concierge Test']);
  await mkdir(path.join(directory, '.specify'), { recursive: true });
  await mkdir(path.join(directory, 'specs', '0015-send-jira-button'), { recursive: true });
  await writeFile(
    path.join(directory, '.specify', 'feature.json'),
    `${JSON.stringify({ feature_directory: 'specs/0015-send-jira-button', keep: true }, null, 2)}\n`,
    'utf8'
  );
  await writeFile(path.join(directory, 'specs', '0015-send-jira-button', 'spec.md'), '# old spec\n', 'utf8');
  await git(directory, ['add', '.']);
  await git(directory, ['commit', '-m', 'main has previous feature']);
};

const readFeatureJson = async (repositoryPath: string): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(path.join(repositoryPath, '.specify', 'feature.json'), 'utf8')) as Record<string, unknown>;

const readCommittedFeatureDirectory = async (repositoryPath: string): Promise<string | undefined> => {
  const raw = await gitOutput(repositoryPath, ['show', 'HEAD:.specify/feature.json']);
  const parsed = JSON.parse(raw) as { feature_directory?: unknown };
  return typeof parsed.feature_directory === 'string' ? parsed.feature_directory : undefined;
};

describe('decideSpecifyFeatureDirectory', () => {
  it('selects the spec.md directory that Specify actually changed instead of the stale inherited feature.json value', () => {
    expect(
      decideSpecifyFeatureDirectory({
        inheritedFeatureDirectory: 'specs/0015-send-jira-button',
        changedPaths: ['specs/0016-smoke-flow-ticketing/spec.md']
      })
    ).toBe('specs/0016-smoke-flow-ticketing');
  });

  it('returns the inherited feature directory unchanged when the changed spec.md is already in that directory', () => {
    expect(
      decideSpecifyFeatureDirectory({
        inheritedFeatureDirectory: 'specs/0015-send-jira-button',
        changedPaths: ['specs/0015-send-jira-button/spec.md']
      })
    ).toBe('specs/0015-send-jira-button');
  });

  it('returns the inherited feature directory when Specify did not change any specs/*/spec.md file', () => {
    expect(
      decideSpecifyFeatureDirectory({
        inheritedFeatureDirectory: 'specs/0015-send-jira-button',
        changedPaths: ['specs/0016-smoke-flow-ticketing/plan.md']
      })
    ).toBe('specs/0015-send-jira-button');
  });
});

describe('decideSpecifyFeatureJsonReconciliation', () => {
  it('requires a commit when the working tree is correct but the committed feature directory is stale', () => {
    expect(
      decideSpecifyFeatureJsonReconciliation({
        featureDirectory: 'specs/0016-smoke-flow-ticketing',
        workingTreeFeatureDirectory: 'specs/0016-smoke-flow-ticketing',
        committedFeatureDirectory: 'specs/0015-send-jira-button'
      })
    ).toEqual({ changed: true, writeWorkingTree: false, commitRequired: true });
  });

  it('requires only a working-tree rewrite when the committed feature directory is already correct', () => {
    expect(
      decideSpecifyFeatureJsonReconciliation({
        featureDirectory: 'specs/0016-smoke-flow-ticketing',
        workingTreeFeatureDirectory: 'specs/0015-send-jira-button',
        committedFeatureDirectory: 'specs/0016-smoke-flow-ticketing'
      })
    ).toEqual({ changed: true, writeWorkingTree: true, commitRequired: false });
  });
});

describe('reconcileSpecifyFeatureJson', () => {
  it('marks feature.json changed when the working tree is current but the committed value is stale', async () => {
    await withTempDir(async (repositoryPath) => {
      await createRepository(repositoryPath);
      const writtenFeatureRel = 'specs/0016-smoke-flow-ticketing';
      await mkdir(path.join(repositoryPath, writtenFeatureRel), { recursive: true });
      await writeFile(path.join(repositoryPath, writtenFeatureRel, 'spec.md'), '# new spec\n', 'utf8');
      await writeFile(
        path.join(repositoryPath, '.specify', 'feature.json'),
        `${JSON.stringify({ feature_directory: writtenFeatureRel, keep: true }, null, 2)}\n`,
        'utf8'
      );

      const result = await reconcileSpecifyFeatureJson({
        repositoryPath,
        logger: { info: vi.fn(), warn: vi.fn() }
      });

      expect(result).toEqual({
        featureDirectory: writtenFeatureRel,
        previousFeatureDirectory: writtenFeatureRel,
        committedFeatureDirectory: 'specs/0015-send-jira-button',
        changed: true,
        commitRequired: true
      });
    });
  }, gitFixtureTimeoutMs);

  it('commits the reconciled feature.json when the working tree is current but HEAD is stale', async () => {
    await withTempDir(async (repositoryPath) => {
      await createRepository(repositoryPath);
      const writtenFeatureRel = 'specs/0016-smoke-flow-ticketing';
      await mkdir(path.join(repositoryPath, writtenFeatureRel), { recursive: true });
      await writeFile(path.join(repositoryPath, writtenFeatureRel, 'spec.md'), '# new spec\n', 'utf8');
      await writeFile(
        path.join(repositoryPath, '.specify', 'feature.json'),
        `${JSON.stringify({ feature_directory: writtenFeatureRel, keep: true }, null, 2)}\n`,
        'utf8'
      );

      const reconcileResult = await reconcileSpecifyFeatureJson({
        repositoryPath,
        logger: { info: vi.fn(), warn: vi.fn() }
      });
      await commitWithTrailer(repositoryPath, {
        step: 'specify',
        status: 'pass',
        files: [
          path.join(writtenFeatureRel, 'spec.md'),
          ...(reconcileResult.changed ? ['.specify/feature.json'] : [])
        ],
        message: 'Concierge specify step'
      });

      await expect(readCommittedFeatureDirectory(repositoryPath)).resolves.toBe(writtenFeatureRel);
    });
  }, gitFixtureTimeoutMs);

  it('keeps the reconciled feature.json durable after a later git checkout resets the worktree', async () => {
    await withTempDir(async (repositoryPath) => {
      await createRepository(repositoryPath);
      const writtenFeatureRel = 'specs/0016-smoke-flow-ticketing';
      await mkdir(path.join(repositoryPath, writtenFeatureRel), { recursive: true });
      await writeFile(path.join(repositoryPath, writtenFeatureRel, 'spec.md'), '# new spec\n', 'utf8');
      await writeFile(
        path.join(repositoryPath, '.specify', 'feature.json'),
        `${JSON.stringify({ feature_directory: writtenFeatureRel, keep: true }, null, 2)}\n`,
        'utf8'
      );

      const reconcileResult = await reconcileSpecifyFeatureJson({
        repositoryPath,
        logger: { info: vi.fn(), warn: vi.fn() }
      });
      await commitWithTrailer(repositoryPath, {
        step: 'specify',
        status: 'pass',
        files: [
          path.join(writtenFeatureRel, 'spec.md'),
          ...(reconcileResult.changed ? ['.specify/feature.json'] : [])
        ],
        message: 'Concierge specify step'
      });
      await git(repositoryPath, ['checkout', '--', '.']);

      await expect(readFeatureJson(repositoryPath)).resolves.toMatchObject({
        feature_directory: writtenFeatureRel
      });
    });
  }, gitFixtureTimeoutMs);

  it('rewrites stale feature.json to the new spec.md directory and resolveFeatureDir then returns that directory', async () => {
    await withTempDir(async (repositoryPath) => {
      await createRepository(repositoryPath);
      await mkdir(path.join(repositoryPath, 'specs', '0016-smoke-flow-ticketing'), { recursive: true });
      await writeFile(path.join(repositoryPath, 'specs', '0016-smoke-flow-ticketing', 'spec.md'), '# new spec\n', 'utf8');

      const result = await reconcileSpecifyFeatureJson({
        repositoryPath,
        logger: { info: vi.fn(), warn: vi.fn() }
      });

      expect(result).toEqual({
        featureDirectory: 'specs/0016-smoke-flow-ticketing',
        previousFeatureDirectory: 'specs/0015-send-jira-button',
        committedFeatureDirectory: 'specs/0015-send-jira-button',
        changed: true,
        commitRequired: true
      });
      await expect(resolveFeatureDir(repositoryPath)).resolves.toBe(
        path.join(repositoryPath, 'specs', '0016-smoke-flow-ticketing')
      );
      await expect(readFeatureJson(repositoryPath)).resolves.toMatchObject({
        feature_directory: 'specs/0016-smoke-flow-ticketing',
        keep: true
      });
    });
  }, gitFixtureTimeoutMs);

  it('does not rewrite feature.json when it already points at the changed spec.md directory', async () => {
    await withTempDir(async (repositoryPath) => {
      await createRepository(repositoryPath);
      await writeFile(
        path.join(repositoryPath, '.specify', 'feature.json'),
        `${JSON.stringify({ feature_directory: 'specs/0015-send-jira-button', keep: true }, null, 2)}\n`,
        'utf8'
      );
      await writeFile(path.join(repositoryPath, 'specs', '0015-send-jira-button', 'spec.md'), '# updated old spec\n', 'utf8');
      const before = await stat(path.join(repositoryPath, '.specify', 'feature.json'));

      const result = await reconcileSpecifyFeatureJson({
        repositoryPath,
        logger: { info: vi.fn(), warn: vi.fn() }
      });

      const after = await stat(path.join(repositoryPath, '.specify', 'feature.json'));
      expect(result).toEqual({
        featureDirectory: 'specs/0015-send-jira-button',
        previousFeatureDirectory: 'specs/0015-send-jira-button',
        committedFeatureDirectory: 'specs/0015-send-jira-button',
        changed: false,
        commitRequired: false
      });
      expect(after.mtimeMs).toBe(before.mtimeMs);
    });
  }, gitFixtureTimeoutMs);
});
