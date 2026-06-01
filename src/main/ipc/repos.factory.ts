import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';
import type { RepositorySummary } from '../data-layer/repositories/repoList';

type ErrorName = 'InvalidReposPayload';

export type ReposListRequest = { owner?: string };
export type ReposListResponse = { repositories: RepositorySummary[] };

export const createReposListRequest = (value: unknown): FactoryResult<ReposListRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidReposPayload', '$');
  if (!root.ok) return root;
  for (const key of Object.keys(root.value)) {
    if (key !== 'owner') {
      return invalid('InvalidReposPayload', 'payload contains an unexpected key', `$.${key}`);
    }
  }
  // owner is optional: omitting it (or passing undefined) lists every repository the
  // signed-in account can see. When provided, it must be a non-empty string filter.
  const owner = root.value.owner;
  if (owner === undefined) {
    return { ok: true, value: {} };
  }
  if (typeof owner !== 'string' || owner.length === 0) {
    return invalid('InvalidReposPayload', 'owner must be a non-empty string when provided', '$.owner');
  }
  return { ok: true, value: { owner } };
};

export const createReposListResponse = (value: unknown): FactoryResult<ReposListResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidReposPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['repositories'], 'InvalidReposPayload', '$');
  if (!keys.ok) return keys;
  if (!Array.isArray(root.value.repositories)) {
    return invalid('InvalidReposPayload', 'repositories must be an array', '$.repositories');
  }
  // Resilience: a single malformed repository row must never blind the user to their
  // entire repo list. Each row is still validated identically to before, but a row that
  // fails validation (bad field or unexpected key) is dropped instead of failing the
  // whole batch. Batch-level structure (non-object payload, non-array repositories) is
  // still rejected so genuinely broken responses surface.
  const repositories: RepositorySummary[] = [];
  for (const repo of root.value.repositories) {
    const record = requireRecord(repo, 'InvalidReposPayload', '$.repositories[]');
    if (!record.ok) continue;
    const hasUnexpectedKey = Object.keys(record.value).some(
      (key) => !['id', 'name', 'owner', 'path', 'defaultBranch', 'description', 'language', 'updatedAt'].includes(key)
    );
    if (hasUnexpectedKey) continue;
    const id = requireString(record.value.id, 'InvalidReposPayload', '$.repositories[].id');
    const name = requireString(record.value.name, 'InvalidReposPayload', '$.repositories[].name');
    const owner = requireString(record.value.owner, 'InvalidReposPayload', '$.repositories[].owner');
    const path = requireString(record.value.path, 'InvalidReposPayload', '$.repositories[].path');
    const defaultBranch = requireString(record.value.defaultBranch, 'InvalidReposPayload', '$.repositories[].defaultBranch');
    if (!id.ok || !name.ok || !owner.ok || !path.ok || !defaultBranch.ok) continue;
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
