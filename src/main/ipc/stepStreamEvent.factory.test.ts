import { describe, expect, it } from 'vitest';
import { createStepStreamEvent } from './stepStreamEvent.factory';

describe('step stream event factory', () => {
  it('defaults progress kind to generic when omitted', () => {
    const event = {
      type: 'progress',
      step: 'plan',
      sessionId: 'plan-1',
      level: 'info',
      message: 'Running plan',
      timestamp: '2026-06-03T00:00:00.000Z'
    };

    expect(createStepStreamEvent(event)).toEqual({
      ok: true,
      value: { ...event, kind: 'generic' }
    });
  });

  it('accepts validated progress kind values', () => {
    const event = {
      type: 'progress',
      step: 'tasks',
      sessionId: 'tasks-1',
      level: 'info',
      message: 'Reading tasks.md',
      timestamp: '2026-06-03T00:00:00.000Z',
      kind: 'assistant-text'
    };

    expect(createStepStreamEvent(event)).toEqual({ ok: true, value: event });
  });

  it('rejects invalid progress kind values', () => {
    expect(createStepStreamEvent({
      type: 'progress',
      step: 'plan',
      sessionId: 'plan-1',
      level: 'info',
      message: 'Running plan',
      timestamp: '2026-06-03T00:00:00.000Z',
      kind: 'delta'
    })).toMatchObject({
      ok: false,
      error: { name: 'InvalidStepStreamEvent', path: '$.kind' }
    });
  });
});
