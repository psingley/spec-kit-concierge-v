import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

afterEach(() => {
  vi.restoreAllMocks();
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

  it('falls back to main when an empty repo reports an empty-string default branch name', () => {
    expect(
      parseGhRepositories([row('astro-poc', { defaultBranchRef: { name: '' } })], 'collette-travel')[0]
    ).toMatchObject({ name: 'astro-poc', defaultBranch: 'main' });
  });

  it('falls back to main when the default branch ref is null', () => {
    expect(
      parseGhRepositories([row('JSnotebooks', { defaultBranchRef: null })], 'collette-travel')[0]
    ).toMatchObject({ name: 'JSnotebooks', defaultBranch: 'main' });
  });

  it('drops rows whose name is an empty string', () => {
    expect(parseGhRepositories([row('', { name: '' })], 'collette-travel')).toEqual([]);
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

  it('lists personal repositories and every organization repository when owner is undefined', async () => {
    const invocations: string[] = [];
    const execFile: ExecFileAdapter = async (command, args) => {
      invocations.push(`${command} ${args.join(' ')}`);
      if (args.join(' ') === 'repo list --limit 1000 --json id,name,owner,description,primaryLanguage,pushedAt,defaultBranchRef') {
        return {
          stdout: JSON.stringify([
            row('spec-kit-concierge-v', { owner: { login: 'psingley' } }),
            row('shared-repo', { id: 'R_shared', owner: { login: 'psingley' } })
          ]),
          stderr: ''
        };
      }
      if (args.join(' ') === 'api --paginate /user/orgs --jq .[].login') {
        return { stdout: 'collette-travel\nother-org\n', stderr: '' };
      }
      if (
        args.join(' ') ===
        'repo list collette-travel --limit 1000 --json id,name,owner,description,primaryLanguage,pushedAt,defaultBranchRef'
      ) {
        return {
          stdout: JSON.stringify([
            row('shared-repo', { id: 'R_shared', owner: { login: 'collette-travel' } }),
            row('pricing-api', { owner: { login: 'collette-travel' } })
          ]),
          stderr: ''
        };
      }
      if (
        args.join(' ') ===
        'repo list other-org --limit 1000 --json id,name,owner,description,primaryLanguage,pushedAt,defaultBranchRef'
      ) {
        return { stdout: JSON.stringify([row('docs', { owner: { login: 'other-org' } })]), stderr: '' };
      }
      throw new Error(`unexpected gh invocation: ${command} ${args.join(' ')}`);
    };

    await expect(listRepositories(undefined, '', execFile)).resolves.toEqual([
      expect.objectContaining({ id: 'R_spec-kit-concierge-v', name: 'spec-kit-concierge-v', owner: 'psingley' }),
      expect.objectContaining({ id: 'R_shared', name: 'shared-repo', owner: 'psingley' }),
      expect.objectContaining({ id: 'R_pricing-api', name: 'pricing-api', owner: 'collette-travel' }),
      expect.objectContaining({ id: 'R_docs', name: 'docs', owner: 'other-org' })
    ]);
    expect(invocations).toEqual([
      'gh repo list --limit 1000 --json id,name,owner,description,primaryLanguage,pushedAt,defaultBranchRef',
      'gh api --paginate /user/orgs --jq .[].login',
      'gh repo list collette-travel --limit 1000 --json id,name,owner,description,primaryLanguage,pushedAt,defaultBranchRef',
      'gh repo list other-org --limit 1000 --json id,name,owner,description,primaryLanguage,pushedAt,defaultBranchRef'
    ]);
  });

  it('falls back to personal repositories when organization enumeration fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const execFile: ExecFileAdapter = async (_command, args) => {
      if (args[0] === 'repo') {
        return { stdout: JSON.stringify([row('spec-kit-concierge-v', { owner: { login: 'psingley' } })]), stderr: '' };
      }
      throw Object.assign(new Error('gh api failed'), { stderr: 'missing read:org scope' });
    };

    await expect(listRepositories(undefined, '', execFile)).resolves.toMatchObject([
      { name: 'spec-kit-concierge-v', owner: 'psingley', path: 'psingley/spec-kit-concierge-v' }
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('GitHub CLI could not list organizations for the signed-in account.'),
      expect.any(Error)
    );
  });

  it('skips one inaccessible organization while returning personal and other organization repositories', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const execFile: ExecFileAdapter = async (_command, args) => {
      if (args.join(' ') === 'repo list --limit 1000 --json id,name,owner,description,primaryLanguage,pushedAt,defaultBranchRef') {
        return { stdout: JSON.stringify([row('spec-kit-concierge-v', { owner: { login: 'psingley' } })]), stderr: '' };
      }
      if (args.join(' ') === 'api --paginate /user/orgs --jq .[].login') {
        return { stdout: 'collette-travel\nlocked-org\n', stderr: '' };
      }
      if (
        args.join(' ') ===
        'repo list collette-travel --limit 1000 --json id,name,owner,description,primaryLanguage,pushedAt,defaultBranchRef'
      ) {
        return { stdout: JSON.stringify([row('pricing-api', { owner: { login: 'collette-travel' } })]), stderr: '' };
      }
      if (
        args.join(' ') ===
        'repo list locked-org --limit 1000 --json id,name,owner,description,primaryLanguage,pushedAt,defaultBranchRef'
      ) {
        throw Object.assign(new Error('gh repo list failed'), { stderr: 'SSO authorization required' });
      }
      throw new Error(`unexpected args: ${args.join(' ')}`);
    };

    await expect(listRepositories(undefined, '', execFile)).resolves.toMatchObject([
      { name: 'spec-kit-concierge-v', owner: 'psingley' },
      { name: 'pricing-api', owner: 'collette-travel' }
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('GitHub CLI could not list repositories for organization locked-org.'),
      expect.any(Error)
    );
  });

  it('returns an empty list (not fixtures) when the signed-in account has no visible repositories', async () => {
    const execFile: ExecFileAdapter = async () => ({ stdout: '[]', stderr: '' });

    await expect(listRepositories(undefined, '', execFile)).resolves.toEqual([]);
  });

  it('surfaces gh failures instead of returning placeholder repositories', async () => {
    const execFile: ExecFileAdapter = async () => {
      throw Object.assign(new Error('gh failed'), { stderr: 'HTTP 403: Resource not accessible by integration' });
    };

    await expect(listRepositories('collette-travel', '', execFile)).rejects.toThrow(
      'GitHub CLI could not list repositories for collette-travel.'
    );
  });

  it('surfaces gh failures for the signed-in account when no owner is supplied', async () => {
    const execFile: ExecFileAdapter = async () => {
      throw Object.assign(new Error('gh failed'), { stderr: 'not logged in' });
    };

    await expect(listRepositories(undefined, '', execFile)).rejects.toThrow(
      'GitHub CLI could not list repositories for the signed-in account.'
    );
  });
});
