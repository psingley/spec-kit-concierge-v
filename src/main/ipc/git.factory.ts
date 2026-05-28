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
type GitMutationErrorName = 'InvalidGitMutationPayload';

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

export type GitCheckoutRequest = {
  repositoryPath: string;
  branch: string;
};

export type GitCheckoutResponse = {
  branch: string;
};

export type GitCreateDraftRequest = {
  repositoryPath: string;
  defaultBranch: string;
};

export type GitCreateDraftResponse = {
  branch: string;
};

const isSafeBranch = (value: string): boolean =>
  value.length > 0 && !value.startsWith('-') && !value.includes('..') && !value.includes('\\');

const isDraftBranch = (value: string): boolean => /^spec\/draft-[a-z0-9]+$/.test(value);

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

export const createGitCheckoutRequest = (value: unknown): FactoryResult<GitCheckoutRequest, GitMutationErrorName> => {
  const root = requireRecord(value, 'InvalidGitMutationPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['repositoryPath', 'branch'], 'InvalidGitMutationPayload', '$');
  if (!keys.ok) return keys;
  const repositoryPath = requireString(root.value.repositoryPath, 'InvalidGitMutationPayload', '$.repositoryPath');
  const branch = requireString(root.value.branch, 'InvalidGitMutationPayload', '$.branch');
  if (!repositoryPath.ok) return repositoryPath;
  if (!branch.ok) return branch;
  if (!isSafeBranch(branch.value)) {
    return invalid('InvalidGitMutationPayload', 'branch must be a safe ref name', '$.branch');
  }
  return { ok: true, value: { repositoryPath: repositoryPath.value, branch: branch.value } };
};

export const createGitCheckoutResponse = (value: unknown): FactoryResult<GitCheckoutResponse, GitMutationErrorName> => {
  const root = requireRecord(value, 'InvalidGitMutationPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['branch'], 'InvalidGitMutationPayload', '$');
  if (!keys.ok) return keys;
  const branch = requireString(root.value.branch, 'InvalidGitMutationPayload', '$.branch');
  if (!branch.ok) return branch;
  if (!isSafeBranch(branch.value)) {
    return invalid('InvalidGitMutationPayload', 'branch must be a safe ref name', '$.branch');
  }
  return { ok: true, value: { branch: branch.value } };
};

export const createGitCreateDraftRequest = (
  value: unknown
): FactoryResult<GitCreateDraftRequest, GitMutationErrorName> => {
  const root = requireRecord(value, 'InvalidGitMutationPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['repositoryPath', 'defaultBranch'], 'InvalidGitMutationPayload', '$');
  if (!keys.ok) return keys;
  const repositoryPath = requireString(root.value.repositoryPath, 'InvalidGitMutationPayload', '$.repositoryPath');
  const defaultBranch = requireString(root.value.defaultBranch, 'InvalidGitMutationPayload', '$.defaultBranch');
  if (!repositoryPath.ok) return repositoryPath;
  if (!defaultBranch.ok) return defaultBranch;
  if (!isSafeBranch(defaultBranch.value)) {
    return invalid('InvalidGitMutationPayload', 'defaultBranch must be a safe ref name', '$.defaultBranch');
  }
  return { ok: true, value: { repositoryPath: repositoryPath.value, defaultBranch: defaultBranch.value } };
};

export const createGitCreateDraftResponse = (
  value: unknown
): FactoryResult<GitCreateDraftResponse, GitMutationErrorName> => {
  const root = requireRecord(value, 'InvalidGitMutationPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['branch'], 'InvalidGitMutationPayload', '$');
  if (!keys.ok) return keys;
  const branch = requireString(root.value.branch, 'InvalidGitMutationPayload', '$.branch');
  if (!branch.ok) return branch;
  if (!isDraftBranch(branch.value)) {
    return invalid('InvalidGitMutationPayload', 'branch must be spec/draft-<base36>', '$.branch');
  }
  return { ok: true, value: { branch: branch.value } };
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
