import { describe, expect, it } from 'vitest';
import { createReposListRequest, createReposListResponse } from './repos.factory';

const request = { owner: 'collette-travel' };
const repo = { id: '1', name: 'site', owner: 'collette-travel', path: '/repo/site', defaultBranch: 'main' };
const response = { repositories: [repo] };

describe('repos IPC factory', () => {
  it('accepts happy path payloads, including an omitted owner for the signed-in account', () => {
    expect(createReposListRequest(request)).toEqual({ ok: true, value: request });
    expect(createReposListRequest({})).toEqual({ ok: true, value: {} });
    expect(createReposListRequest({ owner: undefined })).toEqual({ ok: true, value: {} });
    expect(createReposListRequest({ owner: 'psingley' })).toEqual({ ok: true, value: { owner: 'psingley' } });
    expect(createReposListResponse(response)).toEqual({ ok: true, value: response });
  });
  it('rejects an empty response object', () => {
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
  it('rejects non-string owner values', () => {
    expect(createReposListRequest({ owner: 5 })).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
  });
  it('rejects extra keys on the request, never on a single bad response row', () => {
    expect(createReposListRequest({ ...request, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
  });
  it('drops a malformed response row (missing name) without failing the whole batch', () => {
    expect(createReposListResponse({ repositories: [repo, { id: '2' }] })).toEqual({ ok: true, value: { repositories: [repo] } });
  });
  it('drops a response row with an empty defaultBranch without failing the whole batch', () => {
    const empty = { id: '2', name: 'astro-poc', owner: 'collette-travel', path: 'collette-travel/astro-poc', defaultBranch: '' };
    expect(createReposListResponse({ repositories: [repo, empty] })).toEqual({ ok: true, value: { repositories: [repo] } });
  });
  it('drops a response row with an unexpected key without failing the whole batch', () => {
    expect(createReposListResponse({ repositories: [repo, { ...repo, id: '2', injected: true }] })).toEqual({
      ok: true,
      value: { repositories: [repo] }
    });
  });
  it('still rejects a non-array repositories field at the batch level', () => {
    expect(createReposListResponse({ repositories: 'nope' })).toMatchObject({ ok: false, error: { name: 'InvalidReposPayload' } });
  });
});
