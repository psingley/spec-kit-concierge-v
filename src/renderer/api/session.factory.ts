import {
  invalid,
  isRecord,
  optionalString,
  requireExactKeys,
  requireRecord,
  requireString,
  type RendererBoundaryErrorName,
  type RendererFactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidSessionState';

export type RendererSessionSummary = {
  sessionId: string;
  title?: string;
  cwd?: string;
  updatedAt?: string;
};

export type RendererSessionList = {
  sessions: RendererSessionSummary[];
};

export type RendererSessionCreate = {
  sessionId: string;
  currentModeId: string;
  currentModelId?: string;
};

export const parseRendererSessionList = (
  value: unknown
): RendererFactoryResult<RendererSessionList, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidSessionState', '$');
  if (!root.ok) {
    return root;
  }
  if (!Array.isArray(root.value.sessions)) {
    return invalid('InvalidSessionState', 'sessions must be an array', '$.sessions');
  }
  const exactKeys = requireExactKeys<ErrorName>(root.value, ['sessions']);
  if (!exactKeys.ok) {
    return exactKeys;
  }
  const sessions: RendererSessionSummary[] = [];
  for (const [index, session] of root.value.sessions.entries()) {
    if (!isRecord(session)) {
      return invalid('InvalidSessionState', 'session must be an object', `$.sessions[${index}]`);
    }
    const sessionId = requireString(session.sessionId, 'InvalidSessionState', `$.sessions[${index}].sessionId`);
    if (!sessionId.ok) {
      return sessionId;
    }
    sessions.push({
      sessionId: sessionId.value,
      title: optionalString(session.title),
      cwd: optionalString(session.cwd),
      updatedAt: optionalString(session.updatedAt)
    });
  }

  return { ok: true, value: { sessions } };
};

export const parseRendererSessionCreate = (
  value: unknown
): RendererFactoryResult<RendererSessionCreate, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidSessionState', '$');
  if (!root.ok) {
    return root;
  }
  const sessionId = requireString(root.value.sessionId, 'InvalidSessionState', '$.sessionId');
  if (!sessionId.ok) {
    return sessionId;
  }
  const currentModeId = requireString(root.value.currentModeId, 'InvalidSessionState', '$.currentModeId');
  if (!currentModeId.ok) {
    return currentModeId;
  }
  if (root.value.currentModelId !== undefined && typeof root.value.currentModelId !== 'string') {
    return invalid('InvalidSessionState', 'currentModelId must be a string when present', '$.currentModelId');
  }
  const exactKeys = requireExactKeys<ErrorName>(root.value, ['sessionId', 'currentModeId', 'currentModelId']);
  if (!exactKeys.ok) {
    return exactKeys;
  }

  return {
    ok: true,
    value: {
      sessionId: sessionId.value,
      currentModeId: currentModeId.value,
      currentModelId: optionalString(root.value.currentModelId)
    }
  };
};
