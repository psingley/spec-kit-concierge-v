import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';
import type { RepositorySummary } from '../slices/workspace';

type ErrorName = 'InvalidRepositories';

export type RendererRepositories = { repositories: RepositorySummary[] };

export const parseRendererRepositories = (
  value: unknown
): RendererFactoryResult<RendererRepositories, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidRepositories', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['repositories']);
  if (!keys.ok) return keys;
  if (!Array.isArray(root.value.repositories)) {
    return { ok: false, error: { name: 'InvalidRepositories', message: 'repositories must be an array', path: '$.repositories' } };
  }
  const repositories: RepositorySummary[] = [];
  for (const repo of root.value.repositories) {
    const record = requireRecord(repo, 'InvalidRepositories', '$.repositories[]');
    if (!record.ok) return record;
    const recordKeys = requireExactKeys<ErrorName>(record.value, ['id', 'name', 'owner', 'path', 'defaultBranch', 'description', 'language', 'updatedAt']);
    if (!recordKeys.ok) return recordKeys;
    const id = requireString(record.value.id, 'InvalidRepositories', '$.repositories[].id');
    const name = requireString(record.value.name, 'InvalidRepositories', '$.repositories[].name');
    const owner = requireString(record.value.owner, 'InvalidRepositories', '$.repositories[].owner');
    const path = requireString(record.value.path, 'InvalidRepositories', '$.repositories[].path');
    const defaultBranch = requireString(record.value.defaultBranch, 'InvalidRepositories', '$.repositories[].defaultBranch');
    if (!id.ok) return id;
    if (!name.ok) return name;
    if (!owner.ok) return owner;
    if (!path.ok) return path;
    if (!defaultBranch.ok) return defaultBranch;
    repositories.push({
      id: id.value,
      name: name.value,
      owner: owner.value,
      path: path.value,
      defaultBranch: defaultBranch.value,
      description: typeof record.value.description === 'string' ? record.value.description : undefined,
      language: typeof record.value.language === 'string' ? record.value.language : undefined,
      updatedAt: typeof record.value.updatedAt === 'string' ? record.value.updatedAt : undefined
    });
  }
  return { ok: true, value: { repositories } };
};
