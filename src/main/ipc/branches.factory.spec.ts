import { describe, expect, it } from 'vitest';
import { createBranchSessionsRequest, createBranchSessionsResponse } from './branches.factory';

const restoredStates = { specify: 'complete', clarify: 'pending', plan: 'not_available', tasks: 'not_available', analyze: 'not_available', review: 'not_available' };
const request = { repositoryPath: '/repo' };
const response = { sessions: [{ sessionId: 'session-0006', worktreePath: '/repo.worktrees/session-0006', branch: 'spec/0006-specify-vertical', label: 'Specify vertical', restoredStates }] };

describe('branches IPC factory', () => {
  it('accepts happy path payloads', () => {
    expect(createBranchSessionsRequest(request)).toEqual({ ok: true, value: request });
    expect(createBranchSessionsResponse(response)).toEqual({ ok: true, value: response });
  });
  it('accepts spec-kit NNNN-slug feature branches', () => {
    const speckitResponse = { sessions: [{ sessionId: 'session-014', worktreePath: '/repo.worktrees/session-014', branch: '014-remove-faux-controls', label: '014-remove-faux-controls', restoredStates }] };
    expect(createBranchSessionsResponse(speckitResponse)).toEqual({ ok: true, value: speckitResponse });
  });
  it('accepts a detached (not-yet-named) worktree with branch null', () => {
    const detachedResponse = { sessions: [{ sessionId: 'session-detached', worktreePath: '/repo.worktrees/session-detached', branch: null, label: 'session-detached', restoredStates }] };
    expect(createBranchSessionsResponse(detachedResponse)).toEqual({ ok: true, value: detachedResponse });
  });
  it('rejects empty objects', () => {
    expect(createBranchSessionsRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidBranchesPayload' } });
    expect(createBranchSessionsResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidBranchesPayload' } });
  });
  it('rejects null', () => {
    expect(createBranchSessionsRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidBranchesPayload' } });
    expect(createBranchSessionsResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidBranchesPayload' } });
  });
  it('rejects undefined', () => {
    expect(createBranchSessionsRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidBranchesPayload' } });
    expect(createBranchSessionsResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidBranchesPayload' } });
  });
  it('rejects hostile branch refs', () => {
    expect(createBranchSessionsResponse({ sessions: [{ ...response.sessions[0], branch: 'main' }] })).toMatchObject({ ok: false, error: { name: 'InvalidBranchesPayload' } });
  });
  it('rejects partial fields', () => {
    expect(createBranchSessionsRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidBranchesPayload' } });
    expect(createBranchSessionsResponse({ sessions: [{ branch: 'spec/x' }] })).toMatchObject({ ok: false, error: { name: 'InvalidBranchesPayload' } });
  });
  it('rejects extra keys', () => {
    expect(createBranchSessionsRequest({ ...request, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidBranchesPayload' } });
    expect(createBranchSessionsResponse({ sessions: [{ ...response.sessions[0], injected: true }] })).toMatchObject({ ok: false, error: { name: 'InvalidBranchesPayload' } });
  });
});
