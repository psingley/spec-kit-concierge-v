import { describe, expect, it } from 'vitest';
import { parseRendererCopilotSpecifyAck, parseRendererStepStreamEvent } from './copilotSpecify.factory';

const validAck = { subscriptionId: 'sub-1', sessionId: 'specify-1', step: 'specify', accepted: true };
const validProgress = {
  type: 'progress',
  step: 'specify',
  sessionId: 'specify-1',
  level: 'info',
  message: 'Working',
  timestamp: '2026-05-28T00:00:00.000Z'
};
const validDone = {
  type: 'done',
  step: 'specify',
  sessionId: 'specify-1',
  status: 'pass',
  specMarkdown: '# Spec',
  artifactPath: 'spec.md',
  commitSha: 'abc123',
  reason: undefined
};
const validFailDone = {
  type: 'done',
  step: 'specify',
  sessionId: 'specify-1',
  status: 'fail',
  reason: 'before hook failed'
};

describe('copilot specify renderer factory', () => {
  describe('happy path', () => {
    it('accepts a valid ack payload', () => {
      expect(parseRendererCopilotSpecifyAck(validAck)).toEqual({ ok: true, value: validAck });
    });

    it('accepts a valid progress event', () => {
      expect(parseRendererStepStreamEvent(validProgress)).toEqual({ ok: true, value: validProgress });
    });

    it('accepts fail done events without optional artifact fields', () => {
      expect(parseRendererStepStreamEvent(validFailDone)).toEqual({ ok: true, value: validFailDone });
    });
  });

  describe('empty object', () => {
    it('rejects an ack payload', () => {
      expect(parseRendererCopilotSpecifyAck({})).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecify' } });
    });

    it('rejects a stream event', () => {
      expect(parseRendererStepStreamEvent({})).toMatchObject({ ok: false, error: { name: 'InvalidStepStreamEvent' } });
    });
  });

  describe('null', () => {
    it('rejects an ack payload', () => {
      expect(parseRendererCopilotSpecifyAck(null)).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecify' } });
    });

    it('rejects a stream event', () => {
      expect(parseRendererStepStreamEvent(null)).toMatchObject({ ok: false, error: { name: 'InvalidStepStreamEvent' } });
    });
  });

  describe('undefined', () => {
    it('rejects an ack payload', () => {
      expect(parseRendererCopilotSpecifyAck(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecify' } });
    });

    it('rejects a stream event', () => {
      expect(parseRendererStepStreamEvent(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidStepStreamEvent' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects an ack for another step', () => {
      expect(parseRendererCopilotSpecifyAck({ ...validAck, step: 'plan' })).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecify' } });
    });

    it('rejects invalid event status', () => {
      expect(parseRendererStepStreamEvent({ ...validDone, status: 'skip' })).toMatchObject({ ok: false, error: { name: 'InvalidStepStreamEvent' } });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects a partial ack payload', () => {
      expect(parseRendererCopilotSpecifyAck({ subscriptionId: 'sub-1' })).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecify' } });
    });

    it('rejects a partial progress event', () => {
      expect(parseRendererStepStreamEvent({ type: 'progress', step: 'specify' })).toMatchObject({ ok: false, error: { name: 'InvalidStepStreamEvent' } });
    });
  });

  describe('extra fields', () => {
    it('rejects an extra ack field', () => {
      expect(parseRendererCopilotSpecifyAck({ ...validAck, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' } });
    });

    it('rejects an extra event field', () => {
      expect(parseRendererStepStreamEvent({ ...validProgress, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' } });
    });
  });
});
