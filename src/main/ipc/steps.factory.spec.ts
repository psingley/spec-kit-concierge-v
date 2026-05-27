import { describe, expect, it } from 'vitest';
import { createStepsReadRequest, createStepsReadResponse } from './steps.factory';

const validRequest = { commits: [{ sha: 'abc123', message: 'Concierge-Step: setup:done' }] };
const validResponse = {
  steps: [{ id: 'setup', status: 'done', commitSha: 'abc123', interpretation: 'exact', warnings: [] }]
};

describe('steps IPC factory', () => {
  describe('happy path', () => {
    it('accepts a valid request payload', () => {
      expect(createStepsReadRequest(validRequest)).toEqual({ ok: true, value: validRequest });
    });

    it('accepts a valid response payload', () => {
      expect(createStepsReadResponse(validResponse)).toEqual({ ok: true, value: validResponse });
    });
  });

  describe('empty object', () => {
    it('rejects a request payload', () => {
      expect(createStepsReadRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidStepsReadPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createStepsReadResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidStepsReadPayload' } });
    });
  });

  describe('null', () => {
    it('rejects a request payload', () => {
      expect(createStepsReadRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidStepsReadPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createStepsReadResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidStepsReadPayload' } });
    });
  });

  describe('undefined', () => {
    it('rejects a request payload', () => {
      expect(createStepsReadRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidStepsReadPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createStepsReadResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidStepsReadPayload' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects malformed commits', () => {
      expect(createStepsReadRequest({ commits: [{ sha: 'abc123' }] })).toMatchObject({ ok: false, error: { name: 'InvalidStepsReadPayload' } });
    });

    it('rejects malformed warning lists', () => {
      expect(createStepsReadResponse({ steps: [{ ...validResponse.steps[0], warnings: [1] }] })).toMatchObject({ ok: false, error: { name: 'InvalidStepsReadPayload' } });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects wrong-side request payloads', () => {
      expect(createStepsReadRequest({ changes: [] })).toMatchObject({ ok: false, error: { name: 'InvalidStepsReadPayload' } });
    });

    it('rejects partial response payloads', () => {
      expect(createStepsReadResponse({ steps: [{}] })).toMatchObject({ ok: false, error: { name: 'InvalidStepsReadPayload' } });
    });
  });
});
