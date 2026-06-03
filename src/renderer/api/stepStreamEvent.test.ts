import { describe, expect, it } from 'vitest';
import { parseRendererStepStreamEvent } from './stepStreamEvent';

describe('shared step stream event renderer factory', () => {
  it('accepts clarify progress events', () => {
    const event = {
      type: 'progress',
      step: 'clarify',
      sessionId: 'clarify-1',
      level: 'warn',
      message: 'Re-asking malformed question',
      timestamp: '2026-05-29T00:00:00.000Z'
    };

    expect(parseRendererStepStreamEvent(event)).toEqual({ ok: true, value: { ...event, kind: 'generic' } });
  });

  it('accepts validated progress kind values', () => {
    const event = {
      type: 'progress',
      step: 'plan',
      sessionId: 'plan-1',
      level: 'info',
      message: 'Reading plan context',
      timestamp: '2026-06-03T00:00:00.000Z',
      kind: 'assistant-text'
    };

    expect(parseRendererStepStreamEvent(event)).toEqual({ ok: true, value: event });
  });

  it('accepts progress message ids for assistant row coalescing', () => {
    const event = {
      type: 'progress',
      step: 'plan',
      sessionId: 'plan-1',
      level: 'info',
      message: 'Hello',
      timestamp: '2026-06-03T00:00:00.000Z',
      kind: 'assistant-text',
      messageId: 'message-1'
    };

    expect(parseRendererStepStreamEvent(event)).toEqual({ ok: true, value: event });
  });

  it('defaults missing progress kind to generic', () => {
    const event = {
      type: 'progress',
      step: 'tasks',
      sessionId: 'tasks-1',
      level: 'info',
      message: 'Running tasks',
      timestamp: '2026-06-03T00:00:00.000Z'
    };

    expect(parseRendererStepStreamEvent(event)).toEqual({ ok: true, value: { ...event, kind: 'generic' } });
  });

  it('accepts clarify done pass events with parsed summary payload', () => {
    const event = {
      type: 'done',
      step: 'clarify',
      sessionId: 'clarify-1',
      status: 'pass',
      artifactPath: 'specs/0007-clarify-vertical/spec.md',
      commitSha: 'abc123',
      summary: {
        questions: [{ id: 'q1', text: 'Who uses this?', choices: [{ key: 'A', label: 'Admins' }] }],
        answers: [{ questionId: 'q1', choiceKey: 'A' }]
      }
    };

    expect(parseRendererStepStreamEvent(event)).toEqual({ ok: true, value: event });
  });

  it('rejects extra event fields', () => {
    expect(parseRendererStepStreamEvent({ type: 'done', step: 'clarify', sessionId: 'clarify-1', status: 'fail', reason: 'failed', injected: true })).toMatchObject({
      ok: false,
      error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' }
    });
  });
});
