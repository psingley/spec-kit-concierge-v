import {
  invalid,
  isStringArray,
  requireBoolean,
  requireExactKeys,
  requireNumber,
  requireRecord,
  requireString,
  type FactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidGitReadPayload';

export type GitReadRequest = {
  repositoryPath: string;
  paths: string[];
};

export type GitReadResponse = {
  branch: string;
  ahead: number;
  behind: number;
  dirty: boolean;
  uncommittedPaths: string[];
};

export const createGitReadRequest = (value: unknown): FactoryResult<GitReadRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidGitReadPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['repositoryPath', 'paths'], 'InvalidGitReadPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  const repositoryPath = requireString(root.value.repositoryPath, 'InvalidGitReadPayload', '$.repositoryPath');
  if (!repositoryPath.ok) {
    return repositoryPath;
  }
  if (!isStringArray(root.value.paths)) {
    return invalid('InvalidGitReadPayload', 'paths must be a string array', '$.paths');
  }

  return { ok: true, value: { repositoryPath: repositoryPath.value, paths: root.value.paths } };
};

export const createGitReadResponse = (value: unknown): FactoryResult<GitReadResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidGitReadPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(
    root.value,
    ['branch', 'ahead', 'behind', 'dirty', 'uncommittedPaths'],
    'InvalidGitReadPayload',
    '$'
  );
  if (!keys.ok) {
    return keys;
  }
  const branch = requireString(root.value.branch, 'InvalidGitReadPayload', '$.branch');
  if (!branch.ok) {
    return branch;
  }
  const ahead = requireNumber(root.value.ahead, 'InvalidGitReadPayload', '$.ahead');
  if (!ahead.ok) {
    return ahead;
  }
  const behind = requireNumber(root.value.behind, 'InvalidGitReadPayload', '$.behind');
  if (!behind.ok) {
    return behind;
  }
  const dirty = requireBoolean(root.value.dirty, 'InvalidGitReadPayload', '$.dirty');
  if (!dirty.ok) {
    return dirty;
  }
  if (!isStringArray(root.value.uncommittedPaths)) {
    return invalid('InvalidGitReadPayload', 'uncommittedPaths must be a string array', '$.uncommittedPaths');
  }

  return {
    ok: true,
    value: {
      branch: branch.value,
      ahead: ahead.value,
      behind: behind.value,
      dirty: dirty.value,
      uncommittedPaths: root.value.uncommittedPaths
    }
  };
};
