import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';

type ErrorName = 'InvalidCopilotSpecifyPayload';

export type StepStreamEvent =
  | {
      type: 'progress';
      step: 'specify';
      sessionId: string;
      level: 'info' | 'ok' | 'warn' | 'error';
      message: string;
      timestamp: string;
    }
  | {
      type: 'done';
      step: 'specify';
      sessionId: string;
      status: 'pass' | 'fail';
      specMarkdown?: string;
      artifactPath?: string;
      commitSha?: string;
      reason?: string;
    };

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

export const createStepStreamEvent = (value: unknown): FactoryResult<StepStreamEvent, ErrorName> => {
  const root = requireRecord(value, 'InvalidCopilotSpecifyPayload', '$');
  if (!root.ok) return root;
  if (root.value.type === 'progress') {
    const keys = requireExactKeys(root.value, ['type', 'step', 'sessionId', 'level', 'message', 'timestamp'], 'InvalidCopilotSpecifyPayload', '$');
    if (!keys.ok) return keys;
    const sessionId = requireString(root.value.sessionId, 'InvalidCopilotSpecifyPayload', '$.sessionId');
    const message = requireString(root.value.message, 'InvalidCopilotSpecifyPayload', '$.message');
    const timestamp = requireString(root.value.timestamp, 'InvalidCopilotSpecifyPayload', '$.timestamp');
    if (!sessionId.ok) return sessionId;
    if (!message.ok) return message;
    if (!timestamp.ok) return timestamp;
    if (root.value.step !== 'specify' || !['info', 'ok', 'warn', 'error'].includes(String(root.value.level))) {
      return invalid('InvalidCopilotSpecifyPayload', 'progress event must target specify with a valid level', '$');
    }
    return {
      ok: true,
      value: {
        type: 'progress',
        step: 'specify',
        sessionId: sessionId.value,
        level: root.value.level as 'info' | 'ok' | 'warn' | 'error',
        message: message.value,
        timestamp: timestamp.value
      }
    };
  }
  if (root.value.type === 'done') {
    const allowed = ['type', 'step', 'sessionId', 'status', 'specMarkdown', 'artifactPath', 'commitSha', 'reason'];
    if (!Object.keys(root.value).every((key) => allowed.includes(key))) {
      return invalid('InvalidCopilotSpecifyPayload', 'done event contains an unexpected key', '$');
    }
    const sessionId = requireString(root.value.sessionId, 'InvalidCopilotSpecifyPayload', '$.sessionId');
    if (!sessionId.ok) return sessionId;
    if (root.value.step !== 'specify' || (root.value.status !== 'pass' && root.value.status !== 'fail')) {
      return invalid('InvalidCopilotSpecifyPayload', 'done event must target specify with pass/fail', '$');
    }
    return {
      ok: true,
      value: {
        type: 'done',
        step: 'specify',
        sessionId: sessionId.value,
        status: root.value.status,
        specMarkdown: typeof root.value.specMarkdown === 'string' ? root.value.specMarkdown : undefined,
        artifactPath: typeof root.value.artifactPath === 'string' ? root.value.artifactPath : undefined,
        commitSha: typeof root.value.commitSha === 'string' ? root.value.commitSha : undefined,
        reason: typeof root.value.reason === 'string' ? root.value.reason : undefined
      }
    };
  }
  return invalid('InvalidCopilotSpecifyPayload', 'event type must be progress or done', '$.type');
};
