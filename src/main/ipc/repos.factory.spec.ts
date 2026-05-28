import { describe, expect, it } from 'vitest';
import { createReposListRequest, createReposListResponse } from './repos.factory';

const request = { owner: 'collette-travel' };
const repo = { id: '1', name: 'site', owner: 'collette-travel', path: '/repo/site', defaultBranch: 'main' };
const response = { repositories: [repo] };

describe('repos IPC factory', () => {
  it('accepts happy path payloads', () => {
    expect(createReposListRequest(request)).toEqual({ ok: true, value: request });
    expect(createReposListResponse(response)).toEqual({ ok: true, value: response });
  });
  it('rejects empty objects', () => {
    expect(createReposListRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
    expect(createReposListResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
  });
  it('rejects null', () => {
    expect(createReposListRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
    expect(createReposListResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
  });
  it('rejects undefined', () => {
    expect(createReposListRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
    expect(createReposListResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
  });
  it('rejects hostile owner values', () => {
    expect(createReposListRequest({ owner: 'other' })).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
  });
  it('rejects partial fields', () => {
    expect(createReposListResponse({ repositories: [{ id: '1' }] })).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
  });
  it('rejects extra keys', () => {
    expect(createReposListRequest({ ...request, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
    expect(createReposListResponse({ repositories: [{ ...repo, injected: true }] })).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
  });
});
