import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';
export { createStepStreamEvent, type StepStreamEvent, type StreamEventKind } from './stepStreamEvent.factory';

type ErrorName = 'InvalidCopilotSpecifyPayload';

export type CopilotSpecifyRequest = {
  subscriptionId: string;
  repositoryPath: string;
  branch: string;
  prompt: string;
  modelId?: string;
};

export type CopilotSpecifyAck = {
  subscriptionId: string;
  sessionId: string;
  step: 'specify';
  accepted: true;
};

export const createCopilotSpecifyRequest = (
  value: unknown
): FactoryResult<CopilotSpecifyRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidCopilotSpecifyPayload', '$');
  if (!root.ok) return root;
  const allowed = ['subscriptionId', 'repositoryPath', 'branch', 'prompt', 'modelId'];
  if (!Object.keys(root.value).every((key) => allowed.includes(key))) {
    return invalid('InvalidCopilotSpecifyPayload', 'payload contains an unexpected key', '$');
  }
  const subscriptionId = requireString(root.value.subscriptionId, 'InvalidCopilotSpecifyPayload', '$.subscriptionId');
  const repositoryPath = requireString(root.value.repositoryPath, 'InvalidCopilotSpecifyPayload', '$.repositoryPath');
  const branch = requireString(root.value.branch, 'InvalidCopilotSpecifyPayload', '$.branch');
  const prompt = requireString(root.value.prompt, 'InvalidCopilotSpecifyPayload', '$.prompt');
  if (!subscriptionId.ok) return subscriptionId;
  if (!repositoryPath.ok) return repositoryPath;
  if (!branch.ok) return branch;
  if (!prompt.ok) return prompt;
  if (prompt.value.trim().length === 0) {
    return invalid('InvalidCopilotSpecifyPayload', 'prompt must not be blank', '$.prompt');
  }
  return {
    ok: true,
    value: {
      subscriptionId: subscriptionId.value,
      repositoryPath: repositoryPath.value,
      branch: branch.value,
      prompt: prompt.value,
      modelId: typeof root.value.modelId === 'string' ? root.value.modelId : undefined
    }
  };
};

export const createCopilotSpecifyAck = (value: unknown): FactoryResult<CopilotSpecifyAck, ErrorName> => {
  const root = requireRecord(value, 'InvalidCopilotSpecifyPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['subscriptionId', 'sessionId', 'step', 'accepted'], 'InvalidCopilotSpecifyPayload', '$');
  if (!keys.ok) return keys;
  const subscriptionId = requireString(root.value.subscriptionId, 'InvalidCopilotSpecifyPayload', '$.subscriptionId');
  const sessionId = requireString(root.value.sessionId, 'InvalidCopilotSpecifyPayload', '$.sessionId');
  if (!subscriptionId.ok) return subscriptionId;
  if (!sessionId.ok) return sessionId;
  if (root.value.step !== 'specify' || root.value.accepted !== true) {
    return invalid('InvalidCopilotSpecifyPayload', 'ack must be accepted specify', '$');
  }
  return { ok: true, value: { subscriptionId: subscriptionId.value, sessionId: sessionId.value, step: 'specify', accepted: true } };
};
