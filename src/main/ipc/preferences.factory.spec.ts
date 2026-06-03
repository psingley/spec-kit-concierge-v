import { describe, expect, it } from 'vitest';
import {
  createPreferencesPayload,
  createPreferencesReadRequest,
  createPreferencesWriteRequest
} from './preferences.factory';

const validReadRequest = { scope: 'user' };
const validPayload = { hydratedFromDisk: true, theme: 'system' };
const validWriteRequest = { theme: 'dark' };

describe('preferences IPC factory', () => {
  describe('happy path', () => {
    it('accepts a valid read payload', () => {
      expect(createPreferencesReadRequest(validReadRequest)).toEqual({ ok: true, value: validReadRequest });
    });

    it('accepts a valid persisted payload', () => {
      expect(createPreferencesPayload(validPayload)).toEqual({ ok: true, value: validPayload });
    });

    it('accepts a valid write payload', () => {
      expect(createPreferencesWriteRequest(validWriteRequest)).toEqual({ ok: true, value: validWriteRequest });
    });

    it('accepts GPT-5.4 mini model and hidden activity-side preferences', () => {
      expect(createPreferencesWriteRequest({
        theme: 'system',
        selectedCopilotModel: 'gpt-5.4-mini',
        activitySide: 'hidden'
      })).toEqual({
        ok: true,
        value: {
          theme: 'system',
          selectedCopilotModel: 'gpt-5.4-mini',
          activitySide: 'hidden'
        }
      });
    });
  });

  describe('empty object', () => {
    it('rejects a read payload', () => {
      expect(createPreferencesReadRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });

    it('rejects a persisted payload', () => {
      expect(createPreferencesPayload({})).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });

    it('rejects a write payload', () => {
      expect(createPreferencesWriteRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });
  });

  describe('null', () => {
    it('rejects a read payload', () => {
      expect(createPreferencesReadRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });

    it('rejects a persisted payload', () => {
      expect(createPreferencesPayload(null)).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });

    it('rejects a write payload', () => {
      expect(createPreferencesWriteRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });
  });

  describe('undefined', () => {
    it('rejects a read payload', () => {
      expect(createPreferencesReadRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });

    it('rejects a persisted payload', () => {
      expect(createPreferencesPayload(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });

    it('rejects a write payload', () => {
      expect(createPreferencesWriteRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects unsupported scopes', () => {
      expect(createPreferencesReadRequest({ scope: 'workspace' })).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });

    it('rejects unsupported persisted themes', () => {
      expect(createPreferencesPayload({ hydratedFromDisk: true, theme: 'neon' })).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });

    it('rejects unsupported write themes', () => {
      expect(createPreferencesWriteRequest({ theme: 'neon' })).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects wrong-side read payloads', () => {
      expect(createPreferencesReadRequest({ theme: 'system' })).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });

    it('rejects partial persisted payloads', () => {
      expect(createPreferencesPayload({ theme: 'system' })).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });

    it('rejects partial write payloads', () => {
      expect(createPreferencesWriteRequest({ hydratedFromDisk: true })).toMatchObject({ ok: false, error: { name: 'InvalidPreferencesPayload' } });
    });
  });
});
