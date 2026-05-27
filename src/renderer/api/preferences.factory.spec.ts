import { describe, expect, it } from 'vitest';
import { parseRendererPreferences } from './preferences.factory';

export const rendererPreferences = { hydratedFromDisk: true, theme: 'system' };

describe('parseRendererPreferences', () => {
  describe('happy path', () => {
    it('accepts valid preload preferences state', () => {
      expect(parseRendererPreferences(rendererPreferences)).toEqual({ ok: true, value: rendererPreferences });
    });
  });

  describe('empty object', () => {
    it('returns a named error', () => {
      expect(parseRendererPreferences({})).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesState' } });
    });
  });

  describe('null', () => {
    it('returns a named error', () => {
      expect(parseRendererPreferences(null)).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesState' } });
    });
  });

  describe('undefined', () => {
    it('returns a named error', () => {
      expect(parseRendererPreferences(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesState' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects an unknown theme', () => {
      expect(parseRendererPreferences({ hydratedFromDisk: true, theme: 'neon' })).toMatchObject({
        ok: false,
        error: { name: 'InvalidPreferencesState' }
      });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects missing hydration status', () => {
      expect(parseRendererPreferences({ theme: 'system' })).toMatchObject({
        ok: false,
        error: { name: 'InvalidPreferencesState' }
      });
    });
  });

  describe('extra fields', () => {
    it('returns a stable renderer boundary payload error', () => {
      expect(parseRendererPreferences({ ...rendererPreferences, injected: true })).toMatchObject({
        ok: false,
        error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' }
      });
    });
  });
});
