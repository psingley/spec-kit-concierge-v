import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it, vi } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import { resolveFeatureDir } from './featureDir';
import {
  decideSpecifyFeatureDirectory,
  reconcileSpecifyFeatureJson
} from './reconcileFeatureJson';

const execFileAsync = promisify(execFile);
const gitFixtureTimeoutMs = 60_000;

const git = async (repositoryPath: string, args: string[]): Promise<void> => {
  await execFileAsync('git', args, { cwd: repositoryPath });
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

describe('reconcileSpecifyFeatureJson', () => {
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
        changed: true
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
        changed: false
      });
      expect(after.mtimeMs).toBe(before.mtimeMs);
    });
  }, gitFixtureTimeoutMs);
});
