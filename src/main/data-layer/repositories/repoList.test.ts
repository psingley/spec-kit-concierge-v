import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listRepositories, parseGhRepositories, type GhRepositoryRow } from './repoList';
import type { ExecFileAdapter } from '../auth/cliAuth';

const row = (name: string, overrides: Partial<GhRepositoryRow> = {}): GhRepositoryRow => ({
  id: `R_${name}`,
  name,
  owner: { login: 'collette-travel' },
  description: `${name} description`,
  primaryLanguage: { name: 'TypeScript' },
  pushedAt: '2026-05-30T12:00:00Z',
  defaultBranchRef: { name: 'main' },
  ...overrides
});

describe('parseGhRepositories', () => {
  it('maps many gh repo rows into renderer repository summaries', () => {
    const rows = Array.from({ length: 75 }, (_, index) => row(`repo-${index + 1}`));

    expect(parseGhRepositories(rows, 'collette-travel')).toHaveLength(75);
    expect(parseGhRepositories(rows, 'collette-travel')[74]).toEqual({
      id: 'R_repo-75',
      name: 'repo-75',
      owner: 'collette-travel',
      path: 'collette-travel/repo-75',
      defaultBranch: 'main',
      description: 'repo-75 description',
      language: 'TypeScript',
      updatedAt: '2026-05-30T12:00:00Z'
    });
  });

  it('keeps repos with missing optional metadata and falls back only for required defaults', () => {
    expect(
      parseGhRepositories(
        [
          row('content-tools', {
            id: undefined,
            owner: undefined,
            description: null,
            primaryLanguage: null,
            pushedAt: null,
            defaultBranchRef: null
          })
        ],
        'collette-travel'
      )
    ).toEqual([
      {
        id: 'collette-travel/content-tools',
        name: 'content-tools',
        owner: 'collette-travel',
        path: 'collette-travel/content-tools',
        defaultBranch: 'main',
        description: undefined,
        language: undefined,
        updatedAt: undefined
      }
    ]);
  });

  it('drops malformed rows without inventing repository names', () => {
    expect(parseGhRepositories([{ id: 'bad' }], 'collette-travel')).toEqual([]);
  });
});

describe('listRepositories', () => {
  it('uses a dedicated repos adapter fixture without reading the auth adapter fixture', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'concierge-repos-'));
    const reposAdapterPath = join(dir, 'repos.json');
    await writeFile(
      reposAdapterPath,
      JSON.stringify({
        repositories: [
          {
            id: 'fixture-1',
            name: 'fixture-repo',
            owner: 'collette-travel',
            path: 'collette-travel/fixture-repo',
            defaultBranch: 'main'
          }
        ]
      })
    );
    const execFile: ExecFileAdapter = async () => {
      throw new Error('fixture path should not call gh');
    };

    await expect(listRepositories('collette-travel', reposAdapterPath, execFile)).resolves.toEqual([
      {
        id: 'fixture-1',
        name: 'fixture-repo',
        owner: 'collette-travel',
        path: 'collette-travel/fixture-repo',
        defaultBranch: 'main'
      }
    ]);
  });

  it('calls gh repo list with the requested owner, JSON fields, and pagination limit', async () => {
    const invocations: string[] = [];
    const execFile: ExecFileAdapter = async (command, args) => {
      invocations.push(`${command} ${args.join(' ')}`);
      return { stdout: JSON.stringify([row('collette-web')]), stderr: '' };
    };

    await expect(listRepositories('collette-travel', '', execFile)).resolves.toMatchObject([
      { name: 'collette-web', path: 'collette-travel/collette-web' }
    ]);
    expect(invocations).toEqual([
      'gh repo list collette-travel --limit 1000 --json id,name,owner,description,primaryLanguage,pushedAt,defaultBranchRef'
    ]);
  });

  it('surfaces gh failures instead of returning placeholder repositories', async () => {
    const execFile: ExecFileAdapter = async () => {
      throw Object.assign(new Error('gh failed'), { stderr: 'HTTP 403: Resource not accessible by integration' });
    };

    await expect(listRepositories('collette-travel', '', execFile)).rejects.toThrow(
      'GitHub CLI could not list repositories for collette-travel.'
    );
  });
});
