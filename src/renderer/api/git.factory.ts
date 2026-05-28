import {
  invalid,
  isStringArray,
  requireBoolean,
  requireExactKeys,
  requireNumber,
  requireRecord,
  requireString,
  type RendererBoundaryErrorName,
  type RendererFactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidGitState';
type GitMutationErrorName = 'InvalidGitMutation';

export type RendererGitState = {
  branch: string;
  ahead: number;
  behind: number;
  dirty: boolean;
  uncommittedPaths: string[];
};

export type RendererGitBranchResult = {
  branch: string;
};

export const parseRendererGitState = (
  value: unknown
): RendererFactoryResult<RendererGitState, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidGitState', '$');
  if (!root.ok) {
    return root;
  }
  const branch = requireString(root.value.branch, 'InvalidGitState', '$.branch');
  if (!branch.ok) {
    return branch;
  }
  const ahead = requireNumber(root.value.ahead, 'InvalidGitState', '$.ahead');
  if (!ahead.ok) {
    return ahead;
  }
  const behind = requireNumber(root.value.behind, 'InvalidGitState', '$.behind');
  if (!behind.ok) {
    return behind;
  }
  const dirty = requireBoolean(root.value.dirty, 'InvalidGitState', '$.dirty');
  if (!dirty.ok) {
    return dirty;
  }
  if (!isStringArray(root.value.uncommittedPaths)) {
    return invalid('InvalidGitState', 'uncommittedPaths must be a string array', '$.uncommittedPaths');
  }
  const exactKeys = requireExactKeys<ErrorName>(root.value, ['branch', 'ahead', 'behind', 'dirty', 'uncommittedPaths']);
  if (!exactKeys.ok) {
    return exactKeys;
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

export const parseRendererGitBranchResult = (
  value: unknown
): RendererFactoryResult<RendererGitBranchResult, RendererBoundaryErrorName<GitMutationErrorName>> => {
  const root = requireRecord(value, 'InvalidGitMutation', '$');
  if (!root.ok) return root;
  const exactKeys = requireExactKeys<GitMutationErrorName>(root.value, ['branch']);
  if (!exactKeys.ok) return exactKeys;
  const branch = requireString(root.value.branch, 'InvalidGitMutation', '$.branch');
  if (!branch.ok) return branch;
  if (branch.value.includes('..') || branch.value.startsWith('-')) {
    return invalid('InvalidGitMutation', 'branch must be a safe ref', '$.branch');
  }
  return { ok: true, value: { branch: branch.value } };
};
