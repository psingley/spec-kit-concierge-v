import { describe, expect, it } from 'vitest';
import { parseRendererAuthStatus } from './auth.factory';

export const rendererAuthStatus = { copilotLoggedIn: true, githubLoggedIn: null };

describe('parseRendererAuthStatus', () => {
  describe('happy path', () => {
    it('accepts valid preload auth status', () => {
      expect(parseRendererAuthStatus(rendererAuthStatus)).toEqual({ ok: true, value: rendererAuthStatus });
    });
  });

  describe('empty object', () => {
    it('returns a named error', () => {
      expect(parseRendererAuthStatus({})).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatus' } });
    });
  });

  describe('null', () => {
    it('returns a named error', () => {
      expect(parseRendererAuthStatus(null)).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatus' } });
    });
  });

  describe('undefined', () => {
    it('returns a named error', () => {
      expect(parseRendererAuthStatus(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidAuthStatus' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects a string login status', () => {
      expect(parseRendererAuthStatus({ copilotLoggedIn: 'yes', githubLoggedIn: null })).toMatchObject({
        ok: false,
        error: { name: 'InvalidAuthStatus' }
      });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects a missing provider status', () => {
      expect(parseRendererAuthStatus({ copilotLoggedIn: null })).toMatchObject({
        ok: false,
        error: { name: 'InvalidAuthStatus' }
      });
    });
  });

  describe('extra fields', () => {
    it('returns a stable renderer boundary payload error', () => {
      expect(parseRendererAuthStatus({ ...rendererAuthStatus, injected: true })).toMatchObject({
        ok: false,
        error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' }
      });
    });
  });
});
