import { describe, expect, it } from 'vitest';
import { createAuthStatusRequest, createAuthStatusResponse } from './auth.factory';

const validRequest = { providers: ['copilot', 'github'] };
const validResponse = { copilotLoggedIn: true, githubLoggedIn: null };

describe('auth IPC factory', () => {
  describe('happy path', () => {
    it('accepts a valid request payload', () => {
      expect(createAuthStatusRequest(validRequest)).toEqual({ ok: true, value: validRequest });
    });

    it('accepts a valid response payload', () => {
      expect(createAuthStatusResponse(validResponse)).toEqual({ ok: true, value: validResponse });
    });
  });

  describe('empty object', () => {
    it('rejects a request payload', () => {
      expect(createAuthStatusRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatusPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createAuthStatusResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatusPayload' } });
    });
  });

  describe('null', () => {
    it('rejects a request payload', () => {
      expect(createAuthStatusRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatusPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createAuthStatusResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatusPayload' } });
    });
  });

  describe('undefined', () => {
    it('rejects a request payload', () => {
      expect(createAuthStatusRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatusPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createAuthStatusResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatusPayload' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects unknown providers', () => {
      expect(createAuthStatusRequest({ providers: ['slack'] })).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatusPayload' } });
    });

    it('rejects invalid status types', () => {
      expect(createAuthStatusResponse({ copilotLoggedIn: 'yes', githubLoggedIn: null })).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatusPayload' } });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects a partial request shape', () => {
      expect(createAuthStatusRequest({ provider: 'github' })).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatusPayload' } });
    });

    it('rejects a partial response shape', () => {
      expect(createAuthStatusResponse({ copilotLoggedIn: null })).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatusPayload' } });
    });
  });
});
