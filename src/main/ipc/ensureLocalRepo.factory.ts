import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';

type ErrorName = 'InvalidEnsureLocalRepoPayload';

export type EnsureLocalRepoRequest = {
  owner: string;
  name: string;
  cloneUrl: string;
};

export type EnsureLocalRepoResponse = {
  localPath: string;
  cloned: boolean;
};

const isSafeSegment = (value: string): boolean =>
  value.length > 0 && !value.includes('..') && !value.includes('/') && !value.includes('\\');

const isHttpsGitHubUrl = (value: string): boolean => /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/.test(value);

export const createEnsureLocalRepoRequest = (value: unknown): FactoryResult<EnsureLocalRepoRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidEnsureLocalRepoPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['owner', 'name', 'cloneUrl'], 'InvalidEnsureLocalRepoPayload', '$');
  if (!keys.ok) return keys;
  const owner = requireString(root.value.owner, 'InvalidEnsureLocalRepoPayload', '$.owner');
  const name = requireString(root.value.name, 'InvalidEnsureLocalRepoPayload', '$.name');
  const cloneUrl = requireString(root.value.cloneUrl, 'InvalidEnsureLocalRepoPayload', '$.cloneUrl');
  if (!owner.ok) return owner;
  if (!name.ok) return name;
  if (!cloneUrl.ok) return cloneUrl;
  if (!isSafeSegment(owner.value)) {
    return invalid('InvalidEnsureLocalRepoPayload', 'owner must be a safe path segment', '$.owner');
  }
  if (!isSafeSegment(name.value)) {
    return invalid('InvalidEnsureLocalRepoPayload', 'name must be a safe path segment', '$.name');
  }
  if (!isHttpsGitHubUrl(cloneUrl.value)) {
    return invalid('InvalidEnsureLocalRepoPayload', 'cloneUrl must be an https github.com url', '$.cloneUrl');
  }
  return { ok: true, value: { owner: owner.value, name: name.value, cloneUrl: cloneUrl.value } };
};

export const createEnsureLocalRepoResponse = (value: unknown): FactoryResult<EnsureLocalRepoResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidEnsureLocalRepoPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['localPath', 'cloned'], 'InvalidEnsureLocalRepoPayload', '$');
  if (!keys.ok) return keys;
  const localPath = requireString(root.value.localPath, 'InvalidEnsureLocalRepoPayload', '$.localPath');
  if (!localPath.ok) return localPath;
  if (typeof root.value.cloned !== 'boolean') {
    return invalid('InvalidEnsureLocalRepoPayload', 'cloned must be a boolean', '$.cloned');
  }
  return { ok: true, value: { localPath: localPath.value, cloned: root.value.cloned } };
};
