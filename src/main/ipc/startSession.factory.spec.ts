import { describe, expect, it } from 'vitest';
import { createStartSessionRequest, createStartSessionResponse } from './startSession.factory';

const request = { clonePath: '/clone', defaultBranch: 'main', description: 'Add dark mode' };
const response = { sessionId: 'session-xyz', worktreePath: '/clone.worktrees/session-xyz' };

describe('startSession IPC factory', () => {
  it('accepts happy-path request and response payloads', () => {
    expect(createStartSessionRequest(request)).toEqual({ ok: true, value: request });
    expect(createStartSessionRequest({ ...request, shortName: 'dark' })).toEqual({
      ok: true,
      value: { ...request, shortName: 'dark' }
    });
    expect(createStartSessionResponse(response)).toEqual({ ok: true, value: response });
  });

  it('rejects an empty object', () => {
    expect(createStartSessionRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidStartSessionPayload' } });
    expect(createStartSessionResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidStartSessionPayload' } });
  });

  it('rejects null', () => {
    expect(createStartSessionRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidStartSessionPayload' } });
    expect(createStartSessionResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidStartSessionPayload' } });
  });

  it('rejects undefined', () => {
    expect(createStartSessionRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidStartSessionPayload' } });
    expect(createStartSessionResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidStartSessionPayload' } });
  });

  it('rejects a wrong-typed field (numeric clonePath)', () => {
    expect(createStartSessionRequest({ ...request, clonePath: 5 })).toMatchObject({
      ok: false,
      error: { name: 'InvalidStartSessionPayload' }
    });
  });

  it('rejects an unexpected extra key on the request', () => {
    expect(createStartSessionRequest({ ...request, injected: true })).toMatchObject({
      ok: false,
      error: { name: 'InvalidStartSessionPayload' }
    });
  });

  it('rejects a blank description and a non-string shortName', () => {
    expect(createStartSessionRequest({ ...request, description: '   ' })).toMatchObject({ ok: false });
    expect(createStartSessionRequest({ ...request, shortName: 5 })).toMatchObject({ ok: false });
  });
});
