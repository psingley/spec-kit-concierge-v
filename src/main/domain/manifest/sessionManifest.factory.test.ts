import { describe, expect, it } from 'vitest';
import { SESSION_MANIFEST_SCHEMA, type SessionManifestV1, type StepOwnedArtifactSnapshot } from './types';
import { createSessionManifest } from './sessionManifest.factory';

const baseSnapshot: StepOwnedArtifactSnapshot = {
  step: 'specify',
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  paths: [{
    path: 'specs/0013-hybrid-manifest-architecture/spec.md',
    required: true,
    present: true,
    sha256: 'a'.repeat(64),
    sizeBytes: 123,
    mtimeMs: 1780372800000
  }],
  snapshotHash: 'b'.repeat(64),
  capturedAt: '2026-06-02T00:00:00.000Z'
};

const validManifest = (): SessionManifestV1 => ({
  schema: SESSION_MANIFEST_SCHEMA,
  sessionId: '11111111-1111-4111-8111-111111111111',
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  branch: 'build/manifest-architecture-dogfood',
  createdAt: '2026-06-02T00:00:00.000Z',
  updatedAt: '2026-06-02T00:01:00.000Z',
  currentStep: 'specify',
  attempts: [{
    attemptId: 'attempt-specify-1',
    step: 'specify',
    status: 'pass',
    startedAt: '2026-06-02T00:00:00.000Z',
    endedAt: '2026-06-02T00:01:00.000Z',
    branchBefore: {
      branch: 'build/manifest-architecture-dogfood',
      headSha: 'c'.repeat(40),
      statusPorcelain: '',
      trackedChanges: [],
      timestamp: '2026-06-02T00:00:00.000Z'
    },
    branchAfter: {
      branch: 'build/manifest-architecture-dogfood',
      headSha: 'd'.repeat(40),
      statusPorcelain: '',
      trackedChanges: ['specs/0013-hybrid-manifest-architecture/spec.md'],
      timestamp: '2026-06-02T00:01:00.000Z'
    },
    ownedPathSnapshot: baseSnapshot,
    completionEvidence: {
      commitSha: 'e'.repeat(40),
      trailer: 'Concierge-Step: specify:pass',
      artifactSnapshot: baseSnapshot,
      adoptedFromHistory: false
    },
    spawnRecipe: {
      command: 'copilot',
      args: ['-p', '--agent', 'speckit.specify', '--output-format', 'json', '--session-id', '11111111-1111-4111-8111-111111111111', '--log-dir', '.concierge/logs'],
      cwd: '/repo/spec-kit-concierge-v',
      environmentKeys: ['PATH', 'HOME']
    },
    assistant: [{
      assistantSessionId: 'assistant-1',
      messageId: 'message-1',
      turnId: 'turn-1',
      source: 'print-json-event'
    }],
    logReference: {
      path: '.concierge/logs/specify.jsonl',
      sha256: 'f'.repeat(64),
      sizeBytes: 456
    },
    terminalResult: {
      exitCode: 0,
      resultKind: 'success',
      summary: 'Specify completed',
      rawEventChecksum: '1'.repeat(64)
    },
    anomalyIds: [],
    interventionIds: []
  }],
  anomalies: [],
  interventions: [],
  doctorInvocations: [],
  nudgeRequests: [],
  audit: [{
    auditId: 'audit-1',
    at: '2026-06-02T00:01:00.000Z',
    event: 'manifest-created',
    step: 'specify',
    message: 'Created manifest'
  }]
});

describe('createSessionManifest', () => {
  it('accepts a complete session manifest v1 payload', () => {
    const result = createSessionManifest(validManifest());

    expect(result).toMatchObject({
      ok: true,
      value: {
        schema: SESSION_MANIFEST_SCHEMA,
        currentStep: 'specify',
        attempts: [{ attemptId: 'attempt-specify-1', status: 'pass' }]
      }
    });
  });

  it('rejects an empty object with a named error', () => {
    const result = createSessionManifest({});

    expect(result).toMatchObject({ ok: false, error: { name: 'InvalidSessionManifest' } });
  });

  it('rejects null with a named error', () => {
    const result = createSessionManifest(null);

    expect(result).toMatchObject({ ok: false, error: { name: 'InvalidSessionManifest' } });
  });

  it('rejects undefined with a named error', () => {
    const result = createSessionManifest(undefined);

    expect(result).toMatchObject({ ok: false, error: { name: 'InvalidSessionManifest' } });
  });

  it('rejects hostile attempt statuses', () => {
    const manifest = validManifest();
    const attempt = manifest.attempts[0];
    if (attempt !== undefined) {
      manifest.attempts = [{ ...attempt, status: 'complete' as never }];
    }

    const result = createSessionManifest(manifest);

    expect(result).toMatchObject({
      ok: false,
      error: { name: 'InvalidSessionManifest', path: '$.attempts[0].status' }
    });
  });

  it('rejects partial structurally plausible input', () => {
    const partial = {
      schema: SESSION_MANIFEST_SCHEMA,
      sessionId: '11111111-1111-4111-8111-111111111111',
      featureDir: 'specs/0013-hybrid-manifest-architecture',
      branch: 'build/manifest-architecture-dogfood',
      currentStep: 'specify',
      attempts: []
    };

    const result = createSessionManifest(partial);

    expect(result).toMatchObject({ ok: false, error: { name: 'InvalidSessionManifest' } });
  });

  it('rejects extra top-level keys', () => {
    const result = createSessionManifest({ ...validManifest(), rawTranscript: 'secret' });

    expect(result).toMatchObject({
      ok: false,
      error: { name: 'InvalidSessionManifest', path: '$.rawTranscript' }
    });
  });
});
