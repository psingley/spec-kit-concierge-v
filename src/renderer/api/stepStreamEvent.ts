import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';

export type StepName = 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';
export type StreamEventKind = 'assistant-text' | 'tool-call' | 'status-update' | 'generic';

export type ClarifySummary = {
  questions: Array<{ id: string; position?: number; text: string; choices: Array<{ key: string; label: string }> }>;
  malformedQuestions?: Array<{ id: string; position: number; malformationCategory: string; rawOutput: string }>;
  answers: Array<{ questionId: string; choiceKey: string; note?: string }>;
};

export type PassiveStepSummary = {
  artifacts: Array<{ path: string; kind: 'text' | 'markdown' | 'code' | 'image' | 'pdf'; required: boolean; bytes?: number }>;
  counts: { required: number; optional: number; present: number };
  milestones?: Array<{ id: string; label: string; status: 'pending' | 'running' | 'complete' | 'warning' }>;
};

export type StepStreamEvent =
  | {
      type: 'progress';
      step: StepName;
      sessionId: string;
      level: 'info' | 'ok' | 'warn' | 'error';
      message: string;
      timestamp: string;
      kind?: StreamEventKind;
      messageId?: string;
      raw?: unknown;
    }
  | {
      type: 'done';
      step: StepName;
      sessionId: string;
      status: 'pass' | 'fail';
      specMarkdown?: string;
      artifactPath?: string;
      commitSha?: string;
      branch?: string;
      reason?: string;
      summary?: ClarifySummary | PassiveStepSummary;
    };

type ErrorName = 'InvalidStepStreamEvent';

const stepNames = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'];
const levels = ['info', 'ok', 'warn', 'error'];
const streamEventKinds = ['assistant-text', 'tool-call', 'status-update', 'generic'];
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isStepName = (value: unknown): value is StepName => stepNames.includes(String(value));
const isLevel = (value: unknown): value is 'info' | 'ok' | 'warn' | 'error' => levels.includes(String(value));
const isStreamEventKind = (value: unknown): value is StreamEventKind => streamEventKinds.includes(String(value));
const artifactKinds = ['text', 'markdown', 'code', 'image', 'pdf'] as const;
const milestoneStatuses = ['pending', 'running', 'complete', 'warning'] as const;

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

const parsePassiveSummary = (value: unknown): PassiveStepSummary | undefined => {
  if (!isRecord(value) || !Array.isArray(value.artifacts) || !isRecord(value.counts)) {
    return undefined;
  }
  const required = value.counts.required;
  const optional = value.counts.optional;
  const present = value.counts.present;
  if (typeof required !== 'number' || typeof optional !== 'number' || typeof present !== 'number') {
    return undefined;
  }
  const artifacts = value.artifacts.flatMap((artifact): PassiveStepSummary['artifacts'] => {
    if (!isRecord(artifact) || typeof artifact.path !== 'string' || typeof artifact.required !== 'boolean' || !artifactKinds.includes(artifact.kind as PassiveStepSummary['artifacts'][number]['kind'])) {
      return [];
    }
    return [{ path: artifact.path, kind: artifact.kind as PassiveStepSummary['artifacts'][number]['kind'], required: artifact.required, bytes: typeof artifact.bytes === 'number' ? artifact.bytes : undefined }];
  });
  if (artifacts.length !== value.artifacts.length) {
    return undefined;
  }
  const milestones = Array.isArray(value.milestones)
    ? value.milestones.flatMap((milestone): NonNullable<PassiveStepSummary['milestones']> =>
      isRecord(milestone) && typeof milestone.id === 'string' && typeof milestone.label === 'string' && milestoneStatuses.includes(milestone.status as NonNullable<PassiveStepSummary['milestones']>[number]['status'])
        ? [{ id: milestone.id, label: milestone.label, status: milestone.status as NonNullable<PassiveStepSummary['milestones']>[number]['status'] }]
        : []
    )
    : undefined;
  if (Array.isArray(value.milestones) && milestones?.length !== value.milestones.length) {
    return undefined;
  }
  return { artifacts, counts: { required, optional, present }, milestones };
};

export const parseRendererStepStreamEvent = (
  value: unknown
): RendererFactoryResult<StepStreamEvent, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidStepStreamEvent', '$');
  if (!root.ok) return root;
  if (root.value.type === 'progress') {
    const keys = requireExactKeys<ErrorName>(root.value, ['type', 'step', 'sessionId', 'level', 'message', 'timestamp', 'raw', 'kind', 'messageId']);
    if (!keys.ok) return keys;
    const sessionId = requireString(root.value.sessionId, 'InvalidStepStreamEvent', '$.sessionId');
    const message = requireString(root.value.message, 'InvalidStepStreamEvent', '$.message');
    const timestamp = requireString(root.value.timestamp, 'InvalidStepStreamEvent', '$.timestamp');
    const messageId = root.value.messageId === undefined
      ? undefined
      : requireString(root.value.messageId, 'InvalidStepStreamEvent', '$.messageId');
    if (!sessionId.ok) return sessionId;
    if (!message.ok) return message;
    if (!timestamp.ok) return timestamp;
    if (messageId !== undefined && !messageId.ok) return messageId;
    if (!isStepName(root.value.step) || !isLevel(root.value.level)) {
      return { ok: false, error: { name: 'InvalidStepStreamEvent', message: 'invalid progress event', path: '$' } };
    }
    if (root.value.kind !== undefined && !isStreamEventKind(root.value.kind)) {
      return { ok: false, error: { name: 'InvalidStepStreamEvent', message: 'invalid progress kind', path: '$.kind' } };
    }
    const value: Extract<StepStreamEvent, { type: 'progress' }> = {
      type: 'progress',
      step: root.value.step,
      sessionId: sessionId.value,
      level: root.value.level,
      message: message.value,
      timestamp: timestamp.value,
      kind: root.value.kind ?? 'generic'
    };
    if (messageId !== undefined) {
      value.messageId = messageId.value;
    }
    if (Object.prototype.hasOwnProperty.call(root.value, 'raw')) {
      value.raw = root.value.raw;
    }
    return { ok: true, value };
  }
  if (root.value.type === 'done') {
    const keys = requireExactKeys<ErrorName>(root.value, ['type', 'step', 'sessionId', 'status', 'specMarkdown', 'artifactPath', 'commitSha', 'branch', 'reason', 'summary']);
    if (!keys.ok) return keys;
    const sessionId = requireString(root.value.sessionId, 'InvalidStepStreamEvent', '$.sessionId');
    if (!sessionId.ok) return sessionId;
    if (!isStepName(root.value.step) || (root.value.status !== 'pass' && root.value.status !== 'fail')) {
      return { ok: false, error: { name: 'InvalidStepStreamEvent', message: 'invalid done event', path: '$' } };
    }
    return { ok: true, value: { type: 'done', step: root.value.step, sessionId: sessionId.value, status: root.value.status, specMarkdown: typeof root.value.specMarkdown === 'string' ? root.value.specMarkdown : undefined, artifactPath: typeof root.value.artifactPath === 'string' ? root.value.artifactPath : undefined, commitSha: typeof root.value.commitSha === 'string' ? root.value.commitSha : undefined, branch: typeof root.value.branch === 'string' ? root.value.branch : undefined, reason: typeof root.value.reason === 'string' ? root.value.reason : undefined, summary: parseSummary(root.value.summary) ?? parsePassiveSummary(root.value.summary) } };
  }
  return { ok: false, error: { name: 'InvalidStepStreamEvent', message: 'unknown event type', path: '$.type' } };
};
