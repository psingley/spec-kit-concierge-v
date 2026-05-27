import { describe, expect, it } from 'vitest';
import { createActivityReadRequest, createActivityReadResponse } from './activity.factory';

const validRequest = { limit: 25 };
const validResponse = {
  entries: [{ id: '1', timestamp: '2026-05-27T00:00:00.000Z', level: 'info', message: 'ok' }],
  cap: 256
};

describe('activity IPC factory', () => {
  describe('happy path', () => {
    it('accepts a valid request payload', () => {
      expect(createActivityReadRequest(validRequest)).toEqual({ ok: true, value: validRequest });
    });

    it('accepts a valid response payload', () => {
      expect(createActivityReadResponse(validResponse)).toEqual({ ok: true, value: validResponse });
    });
  });

  describe('empty object', () => {
    it('rejects a request payload', () => {
      expect(createActivityReadRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidActivityReadPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createActivityReadResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidActivityReadPayload' } });
    });
  });

  describe('null', () => {
    it('rejects a request payload', () => {
      expect(createActivityReadRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidActivityReadPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createActivityReadResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidActivityReadPayload' } });
    });
  });

  describe('undefined', () => {
    it('rejects a request payload', () => {
      expect(createActivityReadRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidActivityReadPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createActivityReadResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidActivityReadPayload' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects out-of-range limits', () => {
      expect(createActivityReadRequest({ limit: 257 })).toMatchObject({ ok: false, error: { name: 'InvalidActivityReadPayload' } });
    });

    it('rejects invalid caps', () => {
      expect(createActivityReadResponse({ ...validResponse, cap: 100 })).toMatchObject({ ok: false, error: { name: 'InvalidActivityReadPayload' } });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects a wrong-side request payload', () => {
      expect(createActivityReadRequest({ cap: 256 })).toMatchObject({ ok: false, error: { name: 'InvalidActivityReadPayload' } });
    });

    it('rejects partial entries', () => {
      expect(createActivityReadResponse({ entries: [{}], cap: 256 })).toMatchObject({ ok: false, error: { name: 'InvalidActivityReadPayload' } });
    });
  });
});
