import { readTestAdapterConfig } from '../auth/cliAuth';
import { runGh } from '../auth/execGh';

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

export const listRepositories = async (
  owner: 'collette-travel' = 'collette-travel',
  adapterPath = process.env.CONCIERGE_TEST_REPOS_ADAPTER
): Promise<RepositorySummary[]> => {
  const config = await readTestAdapterConfig(adapterPath);
  if (Array.isArray(config?.repositories)) {
    return config.repositories.filter(isRepositorySummary);
  }

  const { stdout } = await runGh(
    ['repo', 'list', owner, '--json', 'id,name,owner,description,primaryLanguage,updatedAt,defaultBranchRef']
  );
  const rows = JSON.parse(stdout) as Array<Record<string, unknown>>;
  return rows.flatMap((row) => {
    const owner = typeof (row.owner as { login?: unknown } | undefined)?.login === 'string' ? (row.owner as { login: string }).login : 'collette-travel';
    const defaultBranch =
      typeof (row.defaultBranchRef as { name?: unknown } | undefined)?.name === 'string'
        ? (row.defaultBranchRef as { name: string }).name
        : 'main';
    const name = typeof row.name === 'string' ? row.name : undefined;
    if (name === undefined) {
      return [];
    }
    return [
      {
        id: typeof row.id === 'string' ? row.id : `${owner}/${name}`,
        name,
        owner,
        path: `${owner}/${name}`,
        defaultBranch,
        description: typeof row.description === 'string' ? row.description : undefined,
        language:
          typeof (row.primaryLanguage as { name?: unknown } | undefined)?.name === 'string'
            ? (row.primaryLanguage as { name: string }).name
            : undefined,
        updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : undefined
      }
    ];
  });
};
