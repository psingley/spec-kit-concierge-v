import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';
import type { StepStreamEvent } from './streamEvents';

type ErrorName = 'InvalidCopilotSpecify';

export type RendererCopilotSpecifyAck = {
  subscriptionId: string;
  sessionId: string;
  step: 'specify';
  accepted: true;
};

export const parseRendererCopilotSpecifyAck = (
  value: unknown
): RendererFactoryResult<RendererCopilotSpecifyAck, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidCopilotSpecify', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['subscriptionId', 'sessionId', 'step', 'accepted']);
  if (!keys.ok) return keys;
  const subscriptionId = requireString(root.value.subscriptionId, 'InvalidCopilotSpecify', '$.subscriptionId');
  const sessionId = requireString(root.value.sessionId, 'InvalidCopilotSpecify', '$.sessionId');
  if (!subscriptionId.ok) return subscriptionId;
  if (!sessionId.ok) return sessionId;
  if (root.value.step !== 'specify' || root.value.accepted !== true) {
    return { ok: false, error: { name: 'InvalidCopilotSpecify', message: 'ack must target specify', path: '$' } };
  }
  return { ok: true, value: { subscriptionId: subscriptionId.value, sessionId: sessionId.value, step: 'specify', accepted: true } };
};

export const parseRendererStepStreamEvent = (
  value: unknown
): RendererFactoryResult<StepStreamEvent, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidCopilotSpecify', '$');
  if (!root.ok) return root;
  if (root.value.type === 'progress') {
    const keys = requireExactKeys<ErrorName>(root.value, ['type', 'step', 'sessionId', 'level', 'message', 'timestamp']);
    if (!keys.ok) return keys;
    const sessionId = requireString(root.value.sessionId, 'InvalidCopilotSpecify', '$.sessionId');
    const message = requireString(root.value.message, 'InvalidCopilotSpecify', '$.message');
    const timestamp = requireString(root.value.timestamp, 'InvalidCopilotSpecify', '$.timestamp');
    if (!sessionId.ok) return sessionId;
    if (!message.ok) return message;
    if (!timestamp.ok) return timestamp;
    if (root.value.step !== 'specify' || !['info', 'ok', 'warn', 'error'].includes(String(root.value.level))) {
      return { ok: false, error: { name: 'InvalidCopilotSpecify', message: 'invalid progress event', path: '$' } };
    }
    return { ok: true, value: { type: 'progress', step: 'specify', sessionId: sessionId.value, level: root.value.level as 'info' | 'ok' | 'warn' | 'error', message: message.value, timestamp: timestamp.value } };
  }
  if (root.value.type === 'done') {
    // Per ADR-0010 + R6-C04: pass events include specMarkdown/artifactPath/commitSha;
    // fail events do not (they carry only reason). Use status to pick the allowed key set.
    if (root.value.status !== 'pass' && root.value.status !== 'fail') {
      return { ok: false, error: { name: 'InvalidCopilotSpecify', message: 'invalid done status', path: '$.status' } };
    }
    const allowedKeys = root.value.status === 'pass'
      ? ['type', 'step', 'sessionId', 'status', 'specMarkdown', 'artifactPath', 'commitSha', 'reason']
      : ['type', 'step', 'sessionId', 'status', 'reason'];
    const keys = requireExactKeys<ErrorName>(root.value, allowedKeys);
    if (!keys.ok) return keys;
    const sessionId = requireString(root.value.sessionId, 'InvalidCopilotSpecify', '$.sessionId');
    if (!sessionId.ok) return sessionId;
    if (root.value.step !== 'specify') {
      return { ok: false, error: { name: 'InvalidCopilotSpecify', message: 'invalid done event', path: '$' } };
    }
    return { ok: true, value: { type: 'done', step: 'specify', sessionId: sessionId.value, status: root.value.status, specMarkdown: typeof root.value.specMarkdown === 'string' ? root.value.specMarkdown : undefined, artifactPath: typeof root.value.artifactPath === 'string' ? root.value.artifactPath : undefined, commitSha: typeof root.value.commitSha === 'string' ? root.value.commitSha : undefined, reason: typeof root.value.reason === 'string' ? root.value.reason : undefined } };
  }
  return { ok: false, error: { name: 'InvalidCopilotSpecify', message: 'unknown event type', path: '$.type' } };
};
