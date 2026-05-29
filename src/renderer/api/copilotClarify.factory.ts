import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';
export { parseRendererStepStreamEvent } from './stepStreamEvent';

type ErrorName = 'InvalidCopilotClarify';

export type RendererCopilotClarifyAck = {
  subscriptionId: string;
  sessionId: string;
  step: 'clarify';
  accepted: true;
};

export const parseRendererCopilotClarifyAck = (
  value: unknown
): RendererFactoryResult<RendererCopilotClarifyAck, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidCopilotClarify', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['subscriptionId', 'sessionId', 'step', 'accepted']);
  if (!keys.ok) return keys;
  const subscriptionId = requireString(root.value.subscriptionId, 'InvalidCopilotClarify', '$.subscriptionId');
  const sessionId = requireString(root.value.sessionId, 'InvalidCopilotClarify', '$.sessionId');
  if (!subscriptionId.ok) return subscriptionId;
  if (!sessionId.ok) return sessionId;
  if (root.value.step !== 'clarify' || root.value.accepted !== true) {
    return { ok: false, error: { name: 'InvalidCopilotClarify', message: 'ack must target clarify', path: '$' } };
  }
  return { ok: true, value: { subscriptionId: subscriptionId.value, sessionId: sessionId.value, step: 'clarify', accepted: true } };
};
