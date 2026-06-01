import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';

type ErrorName = 'InvalidResumeSessionPayload';

export type ResumeSessionRequest = {
  worktreePath: string;
};

export type ResumeSessionResponse = {
  specMarkdown: string;
  specCommitSha: string | null;
};

export const createResumeSessionRequest = (value: unknown): FactoryResult<ResumeSessionRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidResumeSessionPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['worktreePath'], 'InvalidResumeSessionPayload', '$');
  if (!keys.ok) return keys;
  const worktreePath = requireString(root.value.worktreePath, 'InvalidResumeSessionPayload', '$.worktreePath');
  if (!worktreePath.ok) return worktreePath;
  if (worktreePath.value.includes('..')) {
    return invalid('InvalidResumeSessionPayload', 'worktreePath must not contain traversal', '$.worktreePath');
  }
  return { ok: true, value: { worktreePath: worktreePath.value } };
};

export const createResumeSessionResponse = (value: unknown): FactoryResult<ResumeSessionResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidResumeSessionPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['specMarkdown', 'specCommitSha'], 'InvalidResumeSessionPayload', '$');
  if (!keys.ok) return keys;
  if (typeof root.value.specMarkdown !== 'string') {
    return invalid('InvalidResumeSessionPayload', 'specMarkdown must be a string', '$.specMarkdown');
  }
  // specCommitSha is null for an in-flight session with no committed spec yet, or a
  // 40-char hex sha when the worktree HEAD is readable.
  const rawSha = root.value.specCommitSha;
  let specCommitSha: string | null;
  if (rawSha === null) {
    specCommitSha = null;
  } else if (typeof rawSha === 'string' && /^[0-9a-f]{7,40}$/.test(rawSha)) {
    specCommitSha = rawSha;
  } else {
    return invalid('InvalidResumeSessionPayload', 'specCommitSha must be a hex sha or null', '$.specCommitSha');
  }
  return { ok: true, value: { specMarkdown: root.value.specMarkdown, specCommitSha } };
};
