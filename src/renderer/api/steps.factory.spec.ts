import { describe, expect, it } from 'vitest';
import { parseRendererStepState } from './steps.factory';

export const rendererStepState = {
  steps: [{ id: 'setup', status: 'done', commitSha: 'abc', interpretation: 'exact', warnings: [] }]
};

describe('parseRendererStepState', () => {
  describe('happy path', () => {
    it('accepts valid preload step state', () => {
      expect(parseRendererStepState(rendererStepState)).toEqual({ ok: true, value: rendererStepState });
    });
  });

  describe('empty object', () => {
    it('returns a named error', () => {
      expect(parseRendererStepState({})).toMatchObject({ ok: false, error: { name: 'InvalidStepState' } });
    });
  });

  describe('null', () => {
    it('returns a named error', () => {
      expect(parseRendererStepState(null)).toMatchObject({ ok: false, error: { name: 'InvalidStepState' } });
    });
  });

  describe('undefined', () => {
    it('returns a named error', () => {
      expect(parseRendererStepState(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidStepState' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects non-string warnings', () => {
      expect(parseRendererStepState({ steps: [{ ...rendererStepState.steps[0]!, warnings: [1] }] })).toMatchObject({
        ok: false,
        error: { name: 'InvalidStepState' }
      });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects a partial step record', () => {
      expect(parseRendererStepState({ steps: [{}] })).toMatchObject({
        ok: false,
        error: { name: 'InvalidStepState' }
      });
    });
  });

  describe('extra fields', () => {
    it('returns a stable renderer boundary payload error', () => {
      expect(parseRendererStepState({ ...rendererStepState, injected: true })).toMatchObject({
        ok: false,
        error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' }
      });
    });
  });
});
