import { describe, expect, it } from 'vitest';
import { parseRendererWorkspace } from './workspace.factory';

export const rendererWorkspace = {
  activeRepoPath: '/repo',
  agents: [{ id: 'copilot', displayName: 'Copilot', capabilities: ['text'] }]
};

describe('parseRendererWorkspace', () => {
  describe('happy path', () => {
    it('accepts valid preload workspace state', () => {
      expect(parseRendererWorkspace(rendererWorkspace)).toEqual({ ok: true, value: rendererWorkspace });
    });
  });

  describe('empty object', () => {
    it('returns a named error', () => {
      expect(parseRendererWorkspace({})).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceState' } });
    });
  });

  describe('null', () => {
    it('returns a named error', () => {
      expect(parseRendererWorkspace(null)).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceState' } });
    });
  });

  describe('undefined', () => {
    it('returns a named error', () => {
      expect(parseRendererWorkspace(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidWorkspaceState' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects an agent missing required fields', () => {
      expect(parseRendererWorkspace({ ...rendererWorkspace, agents: [{ id: 'copilot' }] })).toMatchObject({
        ok: false,
        error: { name: 'InvalidWorkspaceState' }
      });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects missing active repository path', () => {
      expect(parseRendererWorkspace({ agents: [] })).toMatchObject({
        ok: false,
        error: { name: 'InvalidWorkspaceState' }
      });
    });
  });

  describe('extra fields', () => {
    it('returns a stable renderer boundary payload error', () => {
      expect(parseRendererWorkspace({ ...rendererWorkspace, injected: true })).toMatchObject({
        ok: false,
        error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' }
      });
    });
  });
});
