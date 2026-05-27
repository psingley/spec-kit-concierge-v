import { describe, expect, it } from 'vitest';
import { createWorkspaceReadRequest, createWorkspaceReadResponse } from './workspace.factory';

const validRequest = { repositoryPath: '/repo' };
const validResponse = {
  activeRepoPath: '/repo',
  agents: [{ id: 'copilot', displayName: 'Copilot', capabilities: ['text', 'tools'] }]
};

describe('workspace IPC factory', () => {
  describe('happy path', () => {
    it('accepts a valid request payload', () => {
      expect(createWorkspaceReadRequest(validRequest)).toEqual({ ok: true, value: validRequest });
    });

    it('accepts a valid response payload', () => {
      expect(createWorkspaceReadResponse(validResponse)).toEqual({ ok: true, value: validResponse });
    });
  });

  describe('empty object', () => {
    it('rejects a request payload', () => {
      expect(createWorkspaceReadRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceReadPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createWorkspaceReadResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceReadPayload' } });
    });
  });

  describe('null', () => {
    it('rejects a request payload', () => {
      expect(createWorkspaceReadRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceReadPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createWorkspaceReadResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceReadPayload' } });
    });
  });

  describe('undefined', () => {
    it('rejects a request payload', () => {
      expect(createWorkspaceReadRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceReadPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createWorkspaceReadResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceReadPayload' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects invalid repository paths', () => {
      expect(createWorkspaceReadRequest({ repositoryPath: 7 })).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceReadPayload' } });
    });

    it('rejects malformed agents', () => {
      expect(createWorkspaceReadResponse({ ...validResponse, agents: [{ id: 'copilot' }] })).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceReadPayload' } });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects wrong-side request payloads', () => {
      expect(createWorkspaceReadRequest({ activeRepoPath: '/repo' })).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceReadPayload' } });
    });

    it('rejects missing active repository path', () => {
      expect(createWorkspaceReadResponse({ agents: [] })).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceReadPayload' } });
    });
  });
});
