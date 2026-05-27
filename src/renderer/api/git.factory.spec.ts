import { describe, expect, it } from 'vitest';
import { parseRendererGitState } from './git.factory';

export const rendererGitState = { branch: 'main', ahead: 0, behind: 1, dirty: true, uncommittedPaths: ['x.ts'] };

describe('parseRendererGitState', () => {
  describe('happy path', () => {
    it('accepts valid preload git state', () => {
      expect(parseRendererGitState(rendererGitState)).toEqual({ ok: true, value: rendererGitState });
    });
  });

  describe('empty object', () => {
    it('returns a named error', () => {
      expect(parseRendererGitState({})).toMatchObject({ ok: false, error: { name: 'InvalidGitState' } });
    });
  });

  describe('null', () => {
    it('returns a named error', () => {
      expect(parseRendererGitState(null)).toMatchObject({ ok: false, error: { name: 'InvalidGitState' } });
    });
  });

  describe('undefined', () => {
    it('returns a named error', () => {
      expect(parseRendererGitState(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidGitState' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects non-boolean dirty state', () => {
      expect(parseRendererGitState({ ...rendererGitState, dirty: 'yes' })).toMatchObject({
        ok: false,
        error: { name: 'InvalidGitState' }
      });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects a partial git state', () => {
      expect(parseRendererGitState({ branch: 'main' })).toMatchObject({
        ok: false,
        error: { name: 'InvalidGitState' }
      });
    });
  });

  describe('extra fields', () => {
    it('returns a stable renderer boundary payload error', () => {
      expect(parseRendererGitState({ ...rendererGitState, injected: true })).toMatchObject({
        ok: false,
        error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' }
      });
    });
  });
});
