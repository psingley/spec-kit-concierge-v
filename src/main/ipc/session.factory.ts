import {
  invalid,
  isRecord,
  optionalString,
  requireExactKeys,
  requireRecord,
  requireString,
  type FactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidSessionPayload';

export type SessionListRequest = {
  cwd: string;
};

export type SessionSummaryPayload = {
  sessionId: string;
  title?: string;
  cwd?: string;
  updatedAt?: string;
};

export type SessionListResponse = {
  sessions: SessionSummaryPayload[];
};

export type SessionCreateRequest = {
  cwd: string;
  mcpServers: Record<string, unknown>[];
  modeId?: string;
  modelId?: string;
  autopilotDecision?: 'allow' | 'deny';
};

export type SessionCreateResponse = {
  sessionId: string;
  currentModeId: string;
  currentModelId?: string;
};

export const createSessionListRequest = (value: unknown): FactoryResult<SessionListRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['cwd'], 'InvalidSessionPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  const cwd = requireString(root.value.cwd, 'InvalidSessionPayload', '$.cwd');
  if (!cwd.ok) {
    return cwd;
  }

  return { ok: true, value: { cwd: cwd.value } };
};

export const createSessionListResponse = (value: unknown): FactoryResult<SessionListResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['sessions'], 'InvalidSessionPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  if (!Array.isArray(root.value.sessions)) {
    return invalid('InvalidSessionPayload', 'sessions must be an array', '$.sessions');
  }
  const sessions: SessionSummaryPayload[] = [];
  for (const [index, session] of root.value.sessions.entries()) {
    if (!isRecord(session)) {
      return invalid('InvalidSessionPayload', 'session must be an object', `$.sessions[${index}]`);
    }
    const sessionId = requireString(session.sessionId, 'InvalidSessionPayload', `$.sessions[${index}].sessionId`);
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

export const createSessionCreateRequest = (
  value: unknown
): FactoryResult<SessionCreateRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionPayload', '$');
  if (!root.ok) {
    return root;
  }
  const allowedKeys = ['cwd', 'mcpServers', 'modeId', 'modelId', 'autopilotDecision'];
  if (Object.keys(root.value).some((key) => !allowedKeys.includes(key))) {
    return invalid('InvalidSessionPayload', 'payload contains unexpected keys', '$');
  }
  const cwd = requireString(root.value.cwd, 'InvalidSessionPayload', '$.cwd');
  if (!cwd.ok) {
    return cwd;
  }
  if (!Array.isArray(root.value.mcpServers) || !root.value.mcpServers.every(isRecord)) {
    return invalid('InvalidSessionPayload', 'mcpServers must be an object array', '$.mcpServers');
  }
  if (root.value.modeId !== undefined && typeof root.value.modeId !== 'string') {
    return invalid('InvalidSessionPayload', 'modeId must be a string when present', '$.modeId');
  }
  if (root.value.modelId !== undefined && typeof root.value.modelId !== 'string') {
    return invalid('InvalidSessionPayload', 'modelId must be a string when present', '$.modelId');
  }
  if (
    root.value.autopilotDecision !== undefined &&
    root.value.autopilotDecision !== 'allow' &&
    root.value.autopilotDecision !== 'deny'
  ) {
    return invalid('InvalidSessionPayload', 'autopilotDecision must be allow or deny', '$.autopilotDecision');
  }

  return {
    ok: true,
    value: {
      cwd: cwd.value,
      mcpServers: root.value.mcpServers,
      modeId: optionalString(root.value.modeId),
      modelId: optionalString(root.value.modelId),
      autopilotDecision:
        root.value.autopilotDecision === 'allow' || root.value.autopilotDecision === 'deny'
          ? root.value.autopilotDecision
          : undefined
    }
  };
};

export const createSessionCreateResponse = (
  value: unknown
): FactoryResult<SessionCreateResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionPayload', '$');
  if (!root.ok) {
    return root;
  }
  const allowedKeys = ['sessionId', 'currentModeId', 'currentModelId'];
  if (Object.keys(root.value).some((key) => !allowedKeys.includes(key))) {
    return invalid('InvalidSessionPayload', 'payload contains unexpected keys', '$');
  }
  const sessionId = requireString(root.value.sessionId, 'InvalidSessionPayload', '$.sessionId');
  if (!sessionId.ok) {
    return sessionId;
  }
  const currentModeId = requireString(root.value.currentModeId, 'InvalidSessionPayload', '$.currentModeId');
  if (!currentModeId.ok) {
    return currentModeId;
  }
  if (root.value.currentModelId !== undefined && typeof root.value.currentModelId !== 'string') {
    return invalid('InvalidSessionPayload', 'currentModelId must be a string when present', '$.currentModelId');
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
