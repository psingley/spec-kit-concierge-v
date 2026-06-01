import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';

type ErrorName = 'InvalidStartSessionPayload';

export type StartSessionRequest = {
  clonePath: string;
  defaultBranch: string;
  description: string;
  shortName?: string;
};

export type StartSessionResponse = {
  sessionId: string;
  worktreePath: string;
  branch: string;
};

export const createStartSessionRequest = (value: unknown): FactoryResult<StartSessionRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidStartSessionPayload', '$');
  if (!root.ok) return root;
  const allowed = ['clonePath', 'defaultBranch', 'description', 'shortName'];
  if (!Object.keys(root.value).every((key) => allowed.includes(key))) {
    return invalid('InvalidStartSessionPayload', 'payload contains an unexpected key', '$');
  }
  const clonePath = requireString(root.value.clonePath, 'InvalidStartSessionPayload', '$.clonePath');
  const defaultBranch = requireString(root.value.defaultBranch, 'InvalidStartSessionPayload', '$.defaultBranch');
  const description = requireString(root.value.description, 'InvalidStartSessionPayload', '$.description');
  if (!clonePath.ok) return clonePath;
  if (!defaultBranch.ok) return defaultBranch;
  if (!description.ok) return description;
  if (description.value.trim().length === 0) {
    return invalid('InvalidStartSessionPayload', 'description must not be blank', '$.description');
  }
  const shortNameRaw = root.value.shortName;
  if (shortNameRaw !== undefined && (typeof shortNameRaw !== 'string' || shortNameRaw.length === 0)) {
    return invalid('InvalidStartSessionPayload', 'shortName must be a non-empty string when provided', '$.shortName');
  }
  return {
    ok: true,
    value: {
      clonePath: clonePath.value,
      defaultBranch: defaultBranch.value,
      description: description.value,
      ...(typeof shortNameRaw === 'string' ? { shortName: shortNameRaw } : {})
    }
  };
};

export const createStartSessionResponse = (value: unknown): FactoryResult<StartSessionResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidStartSessionPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['sessionId', 'worktreePath', 'branch'], 'InvalidStartSessionPayload', '$');
  if (!keys.ok) return keys;
  const sessionId = requireString(root.value.sessionId, 'InvalidStartSessionPayload', '$.sessionId');
  const worktreePath = requireString(root.value.worktreePath, 'InvalidStartSessionPayload', '$.worktreePath');
  const branch = requireString(root.value.branch, 'InvalidStartSessionPayload', '$.branch');
  if (!sessionId.ok) return sessionId;
  if (!worktreePath.ok) return worktreePath;
  if (!branch.ok) return branch;
  return {
    ok: true,
    value: { sessionId: sessionId.value, worktreePath: worktreePath.value, branch: branch.value }
  };
};
