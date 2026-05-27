import { describe, expect, it } from 'vitest';
import { createAppVersionPayload } from './appVersion.factory';

describe('createAppVersionPayload', () => {
  it('returns the typed payload for valid input', () => {
    expect(createAppVersionPayload({ version: '0.1.0' })).toEqual({
      ok: true,
      value: { version: '0.1.0' }
    });
  });

  it('returns a named error for an empty object', () => {
    expect(createAppVersionPayload({})).toMatchObject({
      ok: false,
      error: { name: 'InvalidAppVersionPayload' }
    });
  });

  it('returns a named error for null', () => {
    expect(createAppVersionPayload(null)).toMatchObject({
      ok: false,
      error: { name: 'InvalidAppVersionPayload' }
    });
  });

  it('returns a named error for undefined', () => {
    expect(createAppVersionPayload(undefined)).toMatchObject({
      ok: false,
      error: { name: 'InvalidAppVersionPayload' }
    });
  });

  it('returns a named error for a hostile unexpected proof payload', () => {
    expect(createAppVersionPayload({ version: '0.1.0', eval: 'malicious' })).toMatchObject({
      ok: false,
      error: { name: 'InvalidAppVersionPayload' }
    });
  });

  it('returns a named error for a partial payload missing version', () => {
    expect(createAppVersionPayload({ proof: 'app-version' })).toMatchObject({
      ok: false,
      error: { name: 'InvalidAppVersionPayload' }
    });
  });
});
