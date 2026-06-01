import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';

type ErrorName = 'InvalidStartSession';

export type RendererStartSession = {
  sessionId: string;
  worktreePath: string;
};

export const parseRendererStartSession = (
  value: unknown
): RendererFactoryResult<RendererStartSession, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidStartSession', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['sessionId', 'worktreePath']);
  if (!keys.ok) return keys;
  const sessionId = requireString(root.value.sessionId, 'InvalidStartSession', '$.sessionId');
  if (!sessionId.ok) return sessionId;
  const worktreePath = requireString(root.value.worktreePath, 'InvalidStartSession', '$.worktreePath');
  if (!worktreePath.ok) return worktreePath;
  return { ok: true, value: { sessionId: sessionId.value, worktreePath: worktreePath.value } };
};
