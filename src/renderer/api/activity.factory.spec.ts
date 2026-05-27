import { describe, expect, it } from 'vitest';
import { parseRendererActivity } from './activity.factory';

export const rendererActivity = {
  entries: [{ id: '1', timestamp: '2026-05-27T00:00:00.000Z', level: 'info', message: 'ok' }],
  cap: 256
};

describe('parseRendererActivity', () => {
  describe('happy path', () => {
    it('accepts valid preload activity state', () => {
      expect(parseRendererActivity(rendererActivity)).toEqual({ ok: true, value: rendererActivity });
    });
  });

  describe('empty object', () => {
    it('returns a named error', () => {
      expect(parseRendererActivity({})).toMatchObject({ ok: false, error: { name: 'InvalidActivityState' } });
    });
  });

  describe('null', () => {
    it('returns a named error', () => {
      expect(parseRendererActivity(null)).toMatchObject({ ok: false, error: { name: 'InvalidActivityState' } });
    });
  });

  describe('undefined', () => {
    it('returns a named error', () => {
      expect(parseRendererActivity(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidActivityState' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects an invalid activity cap', () => {
      expect(parseRendererActivity({ ...rendererActivity, cap: 1 })).toMatchObject({
        ok: false,
        error: { name: 'InvalidActivityState' }
      });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects an entry missing required fields', () => {
      expect(parseRendererActivity({ entries: [{}], cap: 256 })).toMatchObject({
        ok: false,
        error: { name: 'InvalidActivityState' }
      });
    });
  });

  describe('extra fields', () => {
    it('returns a stable renderer boundary payload error', () => {
      expect(parseRendererActivity({ ...rendererActivity, injected: true })).toMatchObject({
        ok: false,
        error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' }
      });
    });
  });
});
