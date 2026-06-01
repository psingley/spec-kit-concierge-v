import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readTestAdapterConfig, type ExecFileAdapter } from '../auth/cliAuth';

const execFileAsync = promisify(execFile);
const defaultExecFile: ExecFileAdapter = async (command, args, options) => execFileAsync(command, args, options);
const GH_REPOSITORY_FIELDS = 'id,name,owner,description,primaryLanguage,pushedAt,defaultBranchRef';

export type RepositorySummary = {
  id: string;
  name: string;
  owner: string;
  path: string;
  defaultBranch: string;
  description?: string;
  language?: string;
  updatedAt?: string;
};

const isRepositorySummary = (value: unknown): value is RepositorySummary => {
  const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.owner === 'string' &&
    typeof record.path === 'string' &&
    typeof record.defaultBranch === 'string'
  );
};

export type GhRepositoryRow = {
  id?: unknown;
  name?: unknown;
  owner?: { login?: unknown } | null;
  description?: unknown;
  primaryLanguage?: { name?: unknown } | null;
  pushedAt?: unknown;
  defaultBranchRef?: { name?: unknown } | null;
};

export const parseGhRepositories = (rows: unknown, fallbackOwner: string): RepositorySummary[] => {
  if (!Array.isArray(rows)) {
    throw new Error('gh repo list returned an invalid repository payload.');
  }

  return rows.flatMap((row) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      return [];
    }
    const record = row as GhRepositoryRow;
    const name = typeof record.name === 'string' ? record.name : undefined;
    if (name === undefined || name === '') {
      return [];
    }

    const ownerLogin = record.owner?.login;
    const owner = typeof ownerLogin === 'string' && ownerLogin.length > 0 ? ownerLogin : fallbackOwner;
    const branchName = record.defaultBranchRef?.name;
    const defaultBranch = typeof branchName === 'string' && branchName.length > 0 ? branchName : 'main';
    return [
      {
        id: typeof record.id === 'string' ? record.id : `${owner}/${name}`,
        name,
        owner,
        path: `${owner}/${name}`,
        defaultBranch,
        description: typeof record.description === 'string' ? record.description : undefined,
        language: typeof record.primaryLanguage?.name === 'string' ? record.primaryLanguage.name : undefined,
        updatedAt: typeof record.pushedAt === 'string' ? record.pushedAt : undefined
      }
    ];
  });
};

export const listRepositories = async (
  owner?: string,
  adapterPath = process.env.CONCIERGE_TEST_REPOS_ADAPTER,
  execFileAdapter: ExecFileAdapter = defaultExecFile
): Promise<RepositorySummary[]> => {
  const config = await readTestAdapterConfig(adapterPath);
  if (Array.isArray(config?.repositories)) {
    return config.repositories.filter(isRepositorySummary);
  }

  // When no owner is supplied, `gh repo list` lists every repository the signed-in
  // account can see (personal repos plus any org memberships). When an owner is
  // supplied, it filters to that owner.
  const ownerArgs = owner === undefined ? [] : [owner];
  const target = owner ?? 'the signed-in account';
  try {
    const { stdout } = await execFileAdapter('gh', ['repo', 'list', ...ownerArgs, '--limit', '1000', '--json', GH_REPOSITORY_FIELDS], {
      shell: false
    });
    return parseGhRepositories(JSON.parse(stdout), owner ?? '');
  } catch (error) {
    throw new Error(`GitHub CLI could not list repositories for ${target}.`, { cause: error });
  }
};
