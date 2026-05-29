import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';
import type { StepName } from './stepStreamEvent';
export { parseRendererStepStreamEvent } from './stepStreamEvent';

type ErrorName = 'InvalidCopilotPassive';
export type PassiveStepName = Extract<StepName, 'plan' | 'tasks' | 'analyze'>;

export type RendererCopilotPassiveAck = {
  subscriptionId: string;
  sessionId: string;
  step: PassiveStepName;
  accepted: true;
};

const passiveSteps: PassiveStepName[] = ['plan', 'tasks', 'analyze'];

export const parseRendererCopilotPassiveAck = (
  value: unknown
): RendererFactoryResult<RendererCopilotPassiveAck, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidCopilotPassive', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['subscriptionId', 'sessionId', 'step', 'accepted']);
  if (!keys.ok) return keys;
  const subscriptionId = requireString(root.value.subscriptionId, 'InvalidCopilotPassive', '$.subscriptionId');
  const sessionId = requireString(root.value.sessionId, 'InvalidCopilotPassive', '$.sessionId');
  if (!subscriptionId.ok) return subscriptionId;
  if (!sessionId.ok) return sessionId;
  if (!passiveSteps.includes(root.value.step as PassiveStepName) || root.value.accepted !== true) {
    return { ok: false, error: { name: 'InvalidCopilotPassive', message: 'ack must target a passive step', path: '$' } };
  }
  return { ok: true, value: { subscriptionId: subscriptionId.value, sessionId: sessionId.value, step: root.value.step as PassiveStepName, accepted: true } };
};
