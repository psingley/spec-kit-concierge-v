import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';
import type { RepositorySummary } from '../data-layer/repositories/repoList';

type ErrorName = 'InvalidReposPayload';

export type ReposListRequest = { owner: 'collette-travel' };
export type ReposListResponse = { repositories: RepositorySummary[] };

export const createReposListRequest = (value: unknown): FactoryResult<ReposListRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidReposPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['owner'], 'InvalidReposPayload', '$');
  if (!keys.ok) return keys;
  if (root.value.owner !== 'collette-travel') {
    return invalid('InvalidReposPayload', 'owner must be collette-travel', '$.owner');
  }
  return { ok: true, value: { owner: 'collette-travel' } };
};

export const createReposListResponse = (value: unknown): FactoryResult<ReposListResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidReposPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['repositories'], 'InvalidReposPayload', '$');
  if (!keys.ok) return keys;
  if (!Array.isArray(root.value.repositories)) {
    return invalid('InvalidReposPayload', 'repositories must be an array', '$.repositories');
  }
  const repositories: RepositorySummary[] = [];
  for (const repo of root.value.repositories) {
    const record = requireRecord(repo, 'InvalidReposPayload', '$.repositories[]');
    if (!record.ok) return record;
    for (const key of Object.keys(record.value)) {
      if (!['id', 'name', 'owner', 'path', 'defaultBranch', 'description', 'language', 'updatedAt'].includes(key)) {
        return invalid('InvalidReposPayload', 'repository contains an unexpected key', `$.repositories[].${key}`);
      }
    }
    const id = requireString(record.value.id, 'InvalidReposPayload', '$.repositories[].id');
    const name = requireString(record.value.name, 'InvalidReposPayload', '$.repositories[].name');
    const owner = requireString(record.value.owner, 'InvalidReposPayload', '$.repositories[].owner');
    const path = requireString(record.value.path, 'InvalidReposPayload', '$.repositories[].path');
    const defaultBranch = requireString(record.value.defaultBranch, 'InvalidReposPayload', '$.repositories[].defaultBranch');
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
