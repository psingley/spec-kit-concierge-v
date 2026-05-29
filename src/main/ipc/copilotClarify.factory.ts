import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';
export { createStepStreamEvent, type ClarifySummary, type StepStreamEvent } from './stepStreamEvent.factory';

type ErrorName = 'InvalidCopilotClarifyPayload';

export type ClarifyOperation = 'next' | 'answer' | 'reaskMalformed' | 'askAnother' | 'commit';

export type CopilotClarifyAnswer = {
  questionId: string;
  selectedChoiceKey: string;
  shortAnswer: string;
};

export type CopilotClarifyRequest = {
  subscriptionId: string;
  repositoryPath: string;
  branch: string;
  operation: ClarifyOperation;
  questionId?: string;
  modelId?: string;
  answers: CopilotClarifyAnswer[];
};

export type CopilotClarifyAck = {
  subscriptionId: string;
  sessionId: string;
  step: 'clarify';
  accepted: true;
};

const operations: ClarifyOperation[] = ['next', 'answer', 'reaskMalformed', 'askAnother', 'commit'];

const parseAnswers = (value: unknown): CopilotClarifyAnswer[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((answer): CopilotClarifyAnswer[] => {
    if (typeof answer !== 'object' || answer === null) {
      return [];
    }
    const candidate = answer as Record<string, unknown>;
    if (typeof candidate.questionId !== 'string' || typeof candidate.selectedChoiceKey !== 'string') {
      return [];
    }
    return [{
      questionId: candidate.questionId,
      selectedChoiceKey: candidate.selectedChoiceKey,
      shortAnswer: typeof candidate.shortAnswer === 'string' ? candidate.shortAnswer : ''
    }];
  });
};

export const createCopilotClarifyRequest = (
  value: unknown
): FactoryResult<CopilotClarifyRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidCopilotClarifyPayload', '$');
  if (!root.ok) return root;
  const allowed = ['subscriptionId', 'repositoryPath', 'branch', 'operation', 'questionId', 'modelId', 'answers'];
  if (!Object.keys(root.value).every((key) => allowed.includes(key))) {
    return invalid('InvalidCopilotClarifyPayload', 'payload contains an unexpected key', '$');
  }
  const subscriptionId = requireString(root.value.subscriptionId, 'InvalidCopilotClarifyPayload', '$.subscriptionId');
  const repositoryPath = requireString(root.value.repositoryPath, 'InvalidCopilotClarifyPayload', '$.repositoryPath');
  const branch = requireString(root.value.branch, 'InvalidCopilotClarifyPayload', '$.branch');
  if (!subscriptionId.ok) return subscriptionId;
  if (!repositoryPath.ok) return repositoryPath;
  if (!branch.ok) return branch;
  if (!operations.includes(root.value.operation as ClarifyOperation)) {
    return invalid('InvalidCopilotClarifyPayload', 'operation must be a supported clarify operation', '$.operation');
  }
  return {
    ok: true,
    value: {
      subscriptionId: subscriptionId.value,
      repositoryPath: repositoryPath.value,
      branch: branch.value,
      operation: root.value.operation as ClarifyOperation,
      questionId: typeof root.value.questionId === 'string' ? root.value.questionId : undefined,
      modelId: typeof root.value.modelId === 'string' ? root.value.modelId : undefined,
      answers: parseAnswers(root.value.answers)
    }
  };
};

export const createCopilotClarifyAck = (value: unknown): FactoryResult<CopilotClarifyAck, ErrorName> => {
  const root = requireRecord(value, 'InvalidCopilotClarifyPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['subscriptionId', 'sessionId', 'step', 'accepted'], 'InvalidCopilotClarifyPayload', '$');
  if (!keys.ok) return keys;
  const subscriptionId = requireString(root.value.subscriptionId, 'InvalidCopilotClarifyPayload', '$.subscriptionId');
  const sessionId = requireString(root.value.sessionId, 'InvalidCopilotClarifyPayload', '$.sessionId');
  if (!subscriptionId.ok) return subscriptionId;
  if (!sessionId.ok) return sessionId;
  if (root.value.step !== 'clarify' || root.value.accepted !== true) {
    return invalid('InvalidCopilotClarifyPayload', 'ack must be accepted clarify', '$');
  }
  return { ok: true, value: { subscriptionId: subscriptionId.value, sessionId: sessionId.value, step: 'clarify', accepted: true } };
};
