import { describe, expect, it } from 'vitest';
import { createEnsureLocalRepoRequest, createEnsureLocalRepoResponse } from './ensureLocalRepo.factory';

const request = { owner: 'psingley', name: 'workcells', cloneUrl: 'https://github.com/psingley/workcells.git' };
const response = { localPath: '/Users/dev/Documents/Concierge/psingley/workcells', cloned: true };

describe('ensureLocalRepo IPC factory', () => {
  it('accepts happy path payloads', () => {
    expect(createEnsureLocalRepoRequest(request)).toEqual({ ok: true, value: request });
    expect(createEnsureLocalRepoResponse(response)).toEqual({ ok: true, value: response });
  });
  it('rejects empty objects', () => {
    expect(createEnsureLocalRepoRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
    expect(createEnsureLocalRepoResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
  });
  it('rejects null', () => {
    expect(createEnsureLocalRepoRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
    expect(createEnsureLocalRepoResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
  });
  it('rejects undefined', () => {
    expect(createEnsureLocalRepoRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
    expect(createEnsureLocalRepoResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
  });
  it('rejects partial fields', () => {
    expect(createEnsureLocalRepoRequest({ owner: 'psingley' })).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
    expect(createEnsureLocalRepoResponse({ localPath: '/x' })).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
  });
  it('rejects extra keys', () => {
    expect(createEnsureLocalRepoRequest({ ...request, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
    expect(createEnsureLocalRepoResponse({ ...response, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
  });
  it('rejects hostile clone urls and traversal in owner/name', () => {
    expect(createEnsureLocalRepoRequest({ ...request, cloneUrl: 'file:///etc/passwd' })).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
    expect(createEnsureLocalRepoRequest({ ...request, owner: '../escape' })).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
    expect(createEnsureLocalRepoRequest({ ...request, name: 'a/b' })).toMatchObject({ ok: false, error: { name: 'InvalidEnsureLocalRepoPayload' } });
  });
});
