import { describe, expect, it } from 'vitest';
import { createCopilotSpecifyAck, createCopilotSpecifyRequest, createStepStreamEvent } from './copilotSpecify.factory';

const request = { subscriptionId: 'sub-1', repositoryPath: '/repo', branch: 'spec/x', prompt: 'Build it' };
const ack = { subscriptionId: 'sub-1', sessionId: 'specify-1', step: 'specify', accepted: true };
const progress = { type: 'progress', step: 'specify', sessionId: 'specify-1', level: 'info', message: 'Working', timestamp: '2026-05-28T00:00:00.000Z' };
const done = { type: 'done', step: 'specify', sessionId: 'specify-1', status: 'fail', reason: 'failed' };

describe('copilot specify IPC factory', () => {
  it('accepts happy path payloads', () => {
    expect(createCopilotSpecifyRequest(request)).toEqual({ ok: true, value: request });
    expect(createCopilotSpecifyAck(ack)).toEqual({ ok: true, value: ack });
    expect(createStepStreamEvent(done)).toEqual({ ok: true, value: done });
  });
  it('accepts a passing done event carrying the post-specify branch', () => {
    const passWithBranch = {
      type: 'done',
      step: 'specify',
      sessionId: 'specify-1',
      status: 'pass',
      specMarkdown: '# Spec',
      artifactPath: 'specs/0012-x/spec.md',
      commitSha: 'abc123',
      branch: '014-remove-faux-controls'
    };
    expect(createStepStreamEvent(passWithBranch)).toEqual({ ok: true, value: passWithBranch });
  });
  it('rejects empty objects', () => {
    expect(createCopilotSpecifyRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecifyPayload' } });
    expect(createCopilotSpecifyAck({})).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecifyPayload' } });
    expect(createStepStreamEvent({})).toMatchObject({ ok: false, error: { name: 'InvalidStepStreamEvent' } });
  });
  it('rejects null', () => {
    expect(createCopilotSpecifyRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecifyPayload' } });
    expect(createCopilotSpecifyAck(null)).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecifyPayload' } });
    expect(createStepStreamEvent(null)).toMatchObject({ ok: false, error: { name: 'InvalidStepStreamEvent' } });
  });
  it('rejects undefined', () => {
    expect(createCopilotSpecifyRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecifyPayload' } });
    expect(createCopilotSpecifyAck(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecifyPayload' } });
    expect(createStepStreamEvent(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidStepStreamEvent' } });
  });
  it('rejects hostile values', () => {
    expect(createCopilotSpecifyRequest({ ...request, prompt: ' ' })).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecifyPayload' } });
    expect(createStepStreamEvent({ ...progress, level: 'fatal' })).toMatchObject({ ok: false, error: { name: 'InvalidStepStreamEvent' } });
  });
  it('rejects partial fields', () => {
    expect(createCopilotSpecifyRequest({ subscriptionId: 'sub-1' })).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecifyPayload' } });
    expect(createCopilotSpecifyAck({ subscriptionId: 'sub-1' })).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecifyPayload' } });
    expect(createStepStreamEvent({ type: 'progress', step: 'specify' })).toMatchObject({ ok: false, error: { name: 'InvalidStepStreamEvent' } });
  });
  it('rejects extra keys', () => {
    expect(createCopilotSpecifyRequest({ ...request, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecifyPayload' } });
    expect(createCopilotSpecifyAck({ ...ack, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidCopilotSpecifyPayload' } });
    expect(createStepStreamEvent({ ...done, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidStepStreamEvent' } });
  });
});
