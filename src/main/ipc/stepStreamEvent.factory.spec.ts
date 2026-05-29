import { describe, expect, it } from 'vitest';
import { createStepStreamEvent } from './stepStreamEvent.factory';

const timestamp = '2026-05-29T00:00:00.000Z';

describe('shared step stream event IPC factory', () => {
  it('accepts every ADR-0010 step for progress events', () => {
    for (const step of ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'] as const) {
      expect(createStepStreamEvent({ type: 'progress', step, sessionId: `${step}-1`, level: 'info', message: 'Working', timestamp })).toEqual({
        ok: true,
        value: { type: 'progress', step, sessionId: `${step}-1`, level: 'info', message: 'Working', timestamp }
      });
    }
  });

  it('accepts clarify done pass payloads with artifact and parsed answer summary', () => {
    const event = {
      type: 'done',
      step: 'clarify',
      sessionId: 'clarify-1',
      status: 'pass',
      artifactPath: 'specs/0007-clarify-vertical/spec.md',
      commitSha: 'abc123',
      summary: {
        questions: [{ id: 'q1', text: 'Who uses this?', choices: [{ key: 'A', label: 'Admins' }] }],
        answers: [{ questionId: 'q1', choiceKey: 'A', note: 'Internal first' }]
      }
    };

    expect(createStepStreamEvent(event)).toEqual({ ok: true, value: event });
  });

  it('accepts passive step done payloads with compact artifact manifest summary', () => {
    const event = {
      type: 'done',
      step: 'plan',
      sessionId: 'plan-1',
      status: 'pass',
      commitSha: 'abc123',
      summary: {
        artifacts: [
          { path: 'plan.md', kind: 'markdown', required: true, bytes: 2048 },
          { path: 'contracts/api.md', kind: 'markdown', required: false }
        ],
        counts: { required: 2, optional: 1, present: 2 },
        milestones: [{ id: 'plan-research', label: 'Research captured', status: 'complete' }]
      }
    };

    expect(createStepStreamEvent(event)).toEqual({ ok: true, value: event });
  });

  it('rejects unknown steps', () => {
    expect(createStepStreamEvent({ type: 'progress', step: 'final', sessionId: 's1', level: 'info', message: 'Working', timestamp })).toMatchObject({
      ok: false,
      error: { name: 'InvalidStepStreamEvent' }
    });
  });
});
