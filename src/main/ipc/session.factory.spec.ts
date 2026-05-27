import { describe, expect, it } from 'vitest';
import {
  createSessionCreateRequest,
  createSessionCreateResponse,
  createSessionListRequest,
  createSessionListResponse
} from './session.factory';

const validListRequest = { cwd: '/repo' };
const validListResponse = { sessions: [{ sessionId: 's1', title: 'Work', cwd: '/repo', updatedAt: 'now' }] };
const validCreateRequest = {
  cwd: '/repo',
  mcpServers: [{ name: 'local' }],
  modeId: 'https://agentclientprotocol.com/protocol/session-modes#agent',
  modelId: 'gpt-5.5',
  autopilotDecision: 'allow'
};
const validCreateResponse = { sessionId: 's2', currentModeId: validCreateRequest.modeId, currentModelId: 'gpt-5.5' };

describe('session IPC factory', () => {
  describe('happy path', () => {
    it('accepts a valid list request', () => {
      expect(createSessionListRequest(validListRequest)).toEqual({ ok: true, value: validListRequest });
    });

    it('accepts a valid list response', () => {
      expect(createSessionListResponse(validListResponse)).toEqual({ ok: true, value: validListResponse });
    });

    it('accepts a valid create request', () => {
      expect(createSessionCreateRequest(validCreateRequest)).toEqual({ ok: true, value: validCreateRequest });
    });

    it('accepts a valid create response', () => {
      expect(createSessionCreateResponse(validCreateResponse)).toEqual({ ok: true, value: validCreateResponse });
    });
  });

  describe('empty object', () => {
    it('rejects a list request', () => {
      expect(createSessionListRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects a list response', () => {
      expect(createSessionListResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects a create request', () => {
      expect(createSessionCreateRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects a create response', () => {
      expect(createSessionCreateResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });
  });

  describe('null', () => {
    it('rejects a list request', () => {
      expect(createSessionListRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects a list response', () => {
      expect(createSessionListResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects a create request', () => {
      expect(createSessionCreateRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects a create response', () => {
      expect(createSessionCreateResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });
  });

  describe('undefined', () => {
    it('rejects a list request', () => {
      expect(createSessionListRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects a list response', () => {
      expect(createSessionListResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects a create request', () => {
      expect(createSessionCreateRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects a create response', () => {
      expect(createSessionCreateResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects malformed list request fields', () => {
      expect(createSessionListRequest({ cwd: 1 })).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects malformed list response fields', () => {
      expect(createSessionListResponse({ sessions: [{ title: 'missing id' }] })).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects malformed create request fields', () => {
      expect(createSessionCreateRequest({ ...validCreateRequest, mcpServers: ['bad'] })).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects malformed create response fields', () => {
      expect(createSessionCreateResponse({ ...validCreateResponse, sessionId: '' })).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects wrong-side list request payloads', () => {
      expect(createSessionListRequest({ path: '/repo' })).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects wrong-side list response payloads', () => {
      expect(createSessionListResponse({ session: [] })).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects partial create request payloads', () => {
      expect(createSessionCreateRequest({ cwd: '/repo' })).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });

    it('rejects partial create response payloads', () => {
      expect(createSessionCreateResponse({ currentModeId: 'mode' })).toMatchObject({ ok: false, error: { name: 'InvalidSessionPayload' } });
    });
  });
});
