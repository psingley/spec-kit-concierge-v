import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';

export type StepName = 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';

export type ClarifySummary = {
  questions: Array<{ id: string; position?: number; text: string; choices: Array<{ key: string; label: string }> }>;
  malformedQuestions?: Array<{ id: string; position: number; malformationCategory: string; rawOutput: string }>;
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
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isStepName = (value: unknown): value is StepName => stepNames.includes(String(value));
const isLevel = (value: unknown): value is 'info' | 'ok' | 'warn' | 'error' => levels.includes(String(value));

const parseSummary = (value: unknown): ClarifySummary | undefined => {
  if (!isRecord(value) || !Array.isArray(value.questions) || !Array.isArray(value.answers)) {
    return undefined;
  }
  const questions = value.questions.flatMap((question): ClarifySummary['questions'] => {
      if (!isRecord(question) || typeof question.id !== 'string' || typeof question.text !== 'string' || !Array.isArray(question.choices)) {
        return [];
      }
      return [{
        id: question.id,
        position: typeof question.position === 'number' ? question.position : undefined,
        text: question.text,
        choices: question.choices.flatMap((choice): Array<{ key: string; label: string }> =>
          isRecord(choice) && typeof choice.key === 'string' && typeof choice.label === 'string' ? [{ key: choice.key, label: choice.label }] : []
        )
      }];
    });
  const malformedQuestions = Array.isArray(value.malformedQuestions)
    ? value.malformedQuestions.flatMap((question): NonNullable<ClarifySummary['malformedQuestions']> =>
      isRecord(question) && typeof question.id === 'string' && typeof question.position === 'number' && typeof question.malformationCategory === 'string' && typeof question.rawOutput === 'string'
        ? [{ id: question.id, position: question.position, malformationCategory: question.malformationCategory, rawOutput: question.rawOutput }]
        : []
    )
    : undefined;
  const answers = value.answers.flatMap((answer): ClarifySummary['answers'] =>
      isRecord(answer) && typeof answer.questionId === 'string' && typeof answer.choiceKey === 'string'
        ? [{ questionId: answer.questionId, choiceKey: answer.choiceKey, note: typeof answer.note === 'string' ? answer.note : undefined }]
        : []
    );
  return { questions, malformedQuestions, answers };
};

export const parseRendererStepStreamEvent = (
  value: unknown
): RendererFactoryResult<StepStreamEvent, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidStepStreamEvent', '$');
  if (!root.ok) return root;
  if (root.value.type === 'progress') {
    const keys = requireExactKeys<ErrorName>(root.value, ['type', 'step', 'sessionId', 'level', 'message', 'timestamp']);
    if (!keys.ok) return keys;
    const sessionId = requireString(root.value.sessionId, 'InvalidStepStreamEvent', '$.sessionId');
    const message = requireString(root.value.message, 'InvalidStepStreamEvent', '$.message');
    const timestamp = requireString(root.value.timestamp, 'InvalidStepStreamEvent', '$.timestamp');
    if (!sessionId.ok) return sessionId;
    if (!message.ok) return message;
    if (!timestamp.ok) return timestamp;
    if (!isStepName(root.value.step) || !isLevel(root.value.level)) {
      return { ok: false, error: { name: 'InvalidStepStreamEvent', message: 'invalid progress event', path: '$' } };
    }
    return { ok: true, value: { type: 'progress', step: root.value.step, sessionId: sessionId.value, level: root.value.level, message: message.value, timestamp: timestamp.value } };
  }
  if (root.value.type === 'done') {
    const keys = requireExactKeys<ErrorName>(root.value, ['type', 'step', 'sessionId', 'status', 'specMarkdown', 'artifactPath', 'commitSha', 'reason', 'summary']);
    if (!keys.ok) return keys;
    const sessionId = requireString(root.value.sessionId, 'InvalidStepStreamEvent', '$.sessionId');
    if (!sessionId.ok) return sessionId;
    if (!isStepName(root.value.step) || (root.value.status !== 'pass' && root.value.status !== 'fail')) {
      return { ok: false, error: { name: 'InvalidStepStreamEvent', message: 'invalid done event', path: '$' } };
    }
    return { ok: true, value: { type: 'done', step: root.value.step, sessionId: sessionId.value, status: root.value.status, specMarkdown: typeof root.value.specMarkdown === 'string' ? root.value.specMarkdown : undefined, artifactPath: typeof root.value.artifactPath === 'string' ? root.value.artifactPath : undefined, commitSha: typeof root.value.commitSha === 'string' ? root.value.commitSha : undefined, reason: typeof root.value.reason === 'string' ? root.value.reason : undefined, summary: parseSummary(root.value.summary) } };
  }
  return { ok: false, error: { name: 'InvalidStepStreamEvent', message: 'unknown event type', path: '$.type' } };
};
