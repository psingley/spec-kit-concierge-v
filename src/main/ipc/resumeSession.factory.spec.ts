import { describe, expect, it } from 'vitest';
import { createResumeSessionRequest, createResumeSessionResponse } from './resumeSession.factory';

const request = { worktreePath: '/clone.worktrees/session-xyz' };
const response = { specMarkdown: '# Spec\n\nBody', specCommitSha: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0' };

describe('resumeSession IPC factory', () => {
  it('accepts happy-path request and response payloads (incl. null specCommitSha)', () => {
    expect(createResumeSessionRequest(request)).toEqual({ ok: true, value: request });
    expect(createResumeSessionResponse(response)).toEqual({ ok: true, value: response });
    expect(createResumeSessionResponse({ specMarkdown: '', specCommitSha: null })).toEqual({
      ok: true,
      value: { specMarkdown: '', specCommitSha: null }
    });
  });

  it('rejects an empty object', () => {
    expect(createResumeSessionRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidResumeSessionPayload' } });
    expect(createResumeSessionResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidResumeSessionPayload' } });
  });

  it('rejects null', () => {
    expect(createResumeSessionRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidResumeSessionPayload' } });
    expect(createResumeSessionResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidResumeSessionPayload' } });
  });

  it('rejects undefined', () => {
    expect(createResumeSessionRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidResumeSessionPayload' } });
    expect(createResumeSessionResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidResumeSessionPayload' } });
  });

  it('rejects a hostile traversal worktreePath and a non-hex specCommitSha', () => {
    expect(createResumeSessionRequest({ worktreePath: '/clone/../../etc/passwd' })).toMatchObject({
      ok: false,
      error: { name: 'InvalidResumeSessionPayload' }
    });
    expect(createResumeSessionResponse({ specMarkdown: 'x', specCommitSha: 'not-a-sha' })).toMatchObject({
      ok: false,
      error: { name: 'InvalidResumeSessionPayload' }
    });
  });

  it('rejects a partial-plausible payload (extra key on request, wrong-typed specMarkdown on response)', () => {
    expect(createResumeSessionRequest({ ...request, injected: true })).toMatchObject({
      ok: false,
      error: { name: 'InvalidResumeSessionPayload' }
    });
    expect(createResumeSessionResponse({ specMarkdown: 5, specCommitSha: null })).toMatchObject({
      ok: false,
      error: { name: 'InvalidResumeSessionPayload' }
    });
  });
});
