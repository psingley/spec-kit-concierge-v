import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';

type ErrorName = 'InvalidStartSession';

export type RendererStartSession = {
  sessionId: string;
  worktreePath: string;
  branch: string;
};

export const parseRendererStartSession = (
  value: unknown
): RendererFactoryResult<RendererStartSession, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidStartSession', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['sessionId', 'worktreePath', 'branch']);
  if (!keys.ok) return keys;
  const sessionId = requireString(root.value.sessionId, 'InvalidStartSession', '$.sessionId');
  if (!sessionId.ok) return sessionId;
  const worktreePath = requireString(root.value.worktreePath, 'InvalidStartSession', '$.worktreePath');
  if (!worktreePath.ok) return worktreePath;
  const branch = requireString(root.value.branch, 'InvalidStartSession', '$.branch');
  if (!branch.ok) return branch;
  return { ok: true, value: { sessionId: sessionId.value, worktreePath: worktreePath.value, branch: branch.value } };
};
