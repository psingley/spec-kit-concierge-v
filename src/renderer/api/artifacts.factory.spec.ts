import { describe, expect, it } from 'vitest';
import { parseRendererArtifact } from './artifacts.factory';

const artifact = { artifactPath: 'spec.md', text: '# Spec', size: 6, mtimeMs: 1 };

describe('parseRendererArtifact', () => {
  it('accepts happy path payloads', () => {
    expect(parseRendererArtifact(artifact)).toEqual({ ok: true, value: artifact });
  });
  it('rejects empty objects', () => {
    expect(parseRendererArtifact({})).toMatchObject({ ok: false, error: { name: 'InvalidArtifact' } });
  });
  it('rejects null', () => {
    expect(parseRendererArtifact(null)).toMatchObject({ ok: false, error: { name: 'InvalidArtifact' } });
  });
  it('rejects undefined', () => {
    expect(parseRendererArtifact(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidArtifact' } });
  });
  it('rejects hostile numeric fields', () => {
    expect(parseRendererArtifact({ ...artifact, size: Number.NaN })).toMatchObject({ ok: false, error: { name: 'InvalidArtifact' } });
  });
  it('rejects partial fields', () => {
    expect(parseRendererArtifact({ artifactPath: 'spec.md' })).toMatchObject({ ok: false, error: { name: 'InvalidArtifact' } });
  });
  it('rejects extra keys', () => {
    expect(parseRendererArtifact({ ...artifact, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' } });
  });
});
