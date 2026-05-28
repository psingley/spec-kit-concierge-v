import { describe, expect, it } from 'vitest';
import { createArtifactReadRequest, createArtifactReadResponse } from './artifacts.factory';

const request = { repositoryPath: '/repo', artifactPath: 'spec.md' };
const response = { artifactPath: 'spec.md', text: '# Spec', size: 6, mtimeMs: 1 };

describe('artifacts IPC factory', () => {
  it('accepts happy path payloads', () => {
    expect(createArtifactReadRequest(request)).toEqual({ ok: true, value: request });
    expect(createArtifactReadResponse(response)).toEqual({ ok: true, value: response });
  });
  it('rejects empty objects', () => {
    expect(createArtifactReadRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidArtifactsPayload' } });
    expect(createArtifactReadResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidArtifactsPayload' } });
  });
  it('rejects null', () => {
    expect(createArtifactReadRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidArtifactsPayload' } });
    expect(createArtifactReadResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidArtifactsPayload' } });
  });
  it('rejects undefined', () => {
    expect(createArtifactReadRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidArtifactsPayload' } });
    expect(createArtifactReadResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidArtifactsPayload' } });
  });
  it('rejects hostile traversal paths', () => {
    expect(createArtifactReadRequest({ ...request, artifactPath: '../secret' })).toMatchObject({ ok: false, error: { name: 'InvalidArtifactsPayload' } });
  });
  it('rejects partial fields', () => {
    expect(createArtifactReadRequest({ repositoryPath: '/repo' })).toMatchObject({ ok: false, error: { name: 'InvalidArtifactsPayload' } });
    expect(createArtifactReadResponse({ artifactPath: 'spec.md' })).toMatchObject({ ok: false, error: { name: 'InvalidArtifactsPayload' } });
  });
  it('rejects extra keys', () => {
    expect(createArtifactReadRequest({ ...request, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidArtifactsPayload' } });
    expect(createArtifactReadResponse({ ...response, injected: true })).toMatchObject({ ok: false, error: { name: 'InvalidArtifactsPayload' } });
  });
});
