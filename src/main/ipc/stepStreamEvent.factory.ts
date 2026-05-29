import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';

export type StepName = 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';

export type ClarifySummary = {
  questions: Array<{ id: string; text: string; choices: Array<{ key: string; label: string }> }>;
  answers: Array<{ questionId: string; choiceKey: string; note?: string }>;
};

export type StepStreamEvent =
  | {
      type: 'progress';
      step: StepName;
      sessionId: string;
      level: 'info' | 'ok' | 'warn' | 'error';
      message: string;
      timestamp: string;
    }
  | {
      type: 'done';
      step: StepName;
      sessionId: string;
      status: 'pass' | 'fail';
      specMarkdown?: string;
      artifactPath?: string;
      commitSha?: string;
      reason?: string;
      summary?: ClarifySummary;
    };

type ErrorName = 'InvalidStepStreamEvent';

const stepNames = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'];
const levels = ['info', 'ok', 'warn', 'error'];

const isStepName = (value: unknown): value is StepName => stepNames.includes(String(value));
const isLevel = (value: unknown): value is 'info' | 'ok' | 'warn' | 'error' => levels.includes(String(value));
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const parseSummary = (value: unknown): ClarifySummary | undefined => {
  if (!isRecord(value) || !Array.isArray(value.questions) || !Array.isArray(value.answers)) {
    return undefined;
  }
  const questions = value.questions.flatMap((question): ClarifySummary['questions'] => {
    if (!isRecord(question) || typeof question.id !== 'string' || typeof question.text !== 'string' || !Array.isArray(question.choices)) {
      return [];
    }
    const choices = question.choices.flatMap((choice): Array<{ key: string; label: string }> => {
      if (!isRecord(choice) || typeof choice.key !== 'string' || typeof choice.label !== 'string') {
        return [];
      }
      return [{ key: choice.key, label: choice.label }];
    });
    return [{ id: question.id, text: question.text, choices }];
  });
  const answers = value.answers.flatMap((answer): ClarifySummary['answers'] => {
    if (!isRecord(answer) || typeof answer.questionId !== 'string' || typeof answer.choiceKey !== 'string') {
      return [];
    }
    return [{ questionId: answer.questionId, choiceKey: answer.choiceKey, note: typeof answer.note === 'string' ? answer.note : undefined }];
  });
  return { questions, answers };
};

export const createStepStreamEvent = (value: unknown): FactoryResult<StepStreamEvent, ErrorName> => {
  const root = requireRecord(value, 'InvalidStepStreamEvent', '$');
  if (!root.ok) return root;
  if (root.value.type === 'progress') {
    const keys = requireExactKeys(root.value, ['type', 'step', 'sessionId', 'level', 'message', 'timestamp'], 'InvalidStepStreamEvent', '$');
    if (!keys.ok) return keys;
    const sessionId = requireString(root.value.sessionId, 'InvalidStepStreamEvent', '$.sessionId');
    const message = requireString(root.value.message, 'InvalidStepStreamEvent', '$.message');
    const timestamp = requireString(root.value.timestamp, 'InvalidStepStreamEvent', '$.timestamp');
    if (!sessionId.ok) return sessionId;
    if (!message.ok) return message;
    if (!timestamp.ok) return timestamp;
    if (!isStepName(root.value.step) || !isLevel(root.value.level)) {
      return invalid('InvalidStepStreamEvent', 'progress event must target a valid step with a valid level', '$');
    }
    return { ok: true, value: { type: 'progress', step: root.value.step, sessionId: sessionId.value, level: root.value.level, message: message.value, timestamp: timestamp.value } };
  }
  if (root.value.type === 'done') {
    const allowed = ['type', 'step', 'sessionId', 'status', 'specMarkdown', 'artifactPath', 'commitSha', 'reason', 'summary'];
    if (!Object.keys(root.value).every((key) => allowed.includes(key))) {
      return invalid('InvalidStepStreamEvent', 'done event contains an unexpected key', '$');
    }
    const sessionId = requireString(root.value.sessionId, 'InvalidStepStreamEvent', '$.sessionId');
    if (!sessionId.ok) return sessionId;
    if (!isStepName(root.value.step) || (root.value.status !== 'pass' && root.value.status !== 'fail')) {
      return invalid('InvalidStepStreamEvent', 'done event must target a valid step with pass/fail', '$');
    }
    const summary = parseSummary(root.value.summary);
    return { ok: true, value: { type: 'done', step: root.value.step, sessionId: sessionId.value, status: root.value.status, specMarkdown: typeof root.value.specMarkdown === 'string' ? root.value.specMarkdown : undefined, artifactPath: typeof root.value.artifactPath === 'string' ? root.value.artifactPath : undefined, commitSha: typeof root.value.commitSha === 'string' ? root.value.commitSha : undefined, reason: typeof root.value.reason === 'string' ? root.value.reason : undefined, summary } };
  }
  return invalid('InvalidStepStreamEvent', 'event type must be progress or done', '$.type');
};
