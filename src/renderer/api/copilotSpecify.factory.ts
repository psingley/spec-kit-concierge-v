import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';
export { parseRendererStepStreamEvent } from './stepStreamEvent';

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
