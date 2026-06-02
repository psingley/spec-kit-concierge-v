import { describe, expect, it } from 'vitest';
import { SESSION_MANIFEST_SCHEMA, type BranchStateSnapshot, type SessionManifestV1, type StepAttempt, type StepAttemptStatus, type StepOwnedArtifactSnapshot, type TerminalResult } from './types';
import { appendAuditRecord, appendStepAttempt, transitionStepAttempt } from './sessionManifestReducer';

const timestamp = '2026-06-02T00:00:00.000Z';

const branchSnapshot = (suffix: string): BranchStateSnapshot => ({
  branch: 'build/manifest-architecture-dogfood',
  headSha: suffix.repeat(40).slice(0, 40),
  statusPorcelain: '',
  trackedChanges: [],
  timestamp
});

const artifactSnapshot = (step: StepAttempt['step']): StepOwnedArtifactSnapshot => ({
  step,
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  paths: [{
    path: `specs/0013-hybrid-manifest-architecture/${step}.md`,
    required: true,
    present: true,
    sha256: 'a'.repeat(64),
    sizeBytes: 1,
    mtimeMs: 1780372800000
  }],
  snapshotHash: 'b'.repeat(64),
  capturedAt: timestamp
});

const terminalResult = (resultKind: TerminalResult['resultKind']): TerminalResult => ({
  exitCode: resultKind === 'success' ? 0 : 1,
  resultKind,
  rawEventChecksum: 'c'.repeat(64)
});

const emptyManifest = (): SessionManifestV1 => ({
  schema: SESSION_MANIFEST_SCHEMA,
  sessionId: '11111111-1111-4111-8111-111111111111',
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  branch: 'build/manifest-architecture-dogfood',
  createdAt: timestamp,
  updatedAt: timestamp,
  currentStep: 'specify',
  attempts: [],
  anomalies: [],
  interventions: [],
  doctorInvocations: [],
  nudgeRequests: [],
  audit: []
});

const attempt = (
  attemptId: string,
  status: StepAttemptStatus = 'pending',
  supersedesAttemptId?: string
): StepAttempt => ({
  attemptId,
  step: 'specify',
  status,
  ...(supersedesAttemptId === undefined ? {} : { supersedesAttemptId }),
  startedAt: timestamp,
  branchBefore: branchSnapshot('1'),
  ownedPathSnapshot: artifactSnapshot('specify'),
  spawnRecipe: {
    command: 'copilot',
    args: ['-p', '--agent', 'speckit.specify', '--output-format', 'json', '--session-id', '11111111-1111-4111-8111-111111111111', '--log-dir', '.concierge/logs'],
    cwd: '/repo/spec-kit-concierge-v',
    environmentKeys: ['PATH']
  },
  assistant: [],
  logReference: {
    path: '.concierge/logs/specify.jsonl',
    sha256: 'd'.repeat(64),
    sizeBytes: 1
  },
  anomalyIds: [],
  interventionIds: []
});

describe('sessionManifestReducer', () => {
  it('appends an attempt and transitions pending to running to each terminal status', () => {
    const manifestWithAttempt = appendStepAttempt(emptyManifest(), attempt('attempt-1'));
    expect(manifestWithAttempt).toMatchObject({ ok: true, value: { attempts: [{ status: 'pending' }] } });
    if (!manifestWithAttempt.ok) throw new Error('expected append to succeed');

    const running = transitionStepAttempt(manifestWithAttempt.value, {
      attemptId: 'attempt-1',
      status: 'running',
      branchAfter: branchSnapshot('2')
    });
    expect(running).toMatchObject({ ok: true, value: { attempts: [{ status: 'running' }] } });
    if (!running.ok) throw new Error('expected running transition to succeed');

    for (const [status, resultKind] of [
      ['pass', 'success'],
      ['failed', 'failure'],
      ['killed', 'killed'],
      ['interrupted', 'interrupted']
    ] as const) {
      const terminal = transitionStepAttempt(running.value, {
        attemptId: 'attempt-1',
        status,
        endedAt: '2026-06-02T00:01:00.000Z',
        terminalResult: terminalResult(resultKind)
      });

      expect(terminal).toMatchObject({ ok: true, value: { attempts: [{ status }] } });
    }
  });

  it('keeps superseded terminal attempts and appends a new superseding attempt', () => {
    const terminal = appendStepAttempt(emptyManifest(), {
      ...attempt('attempt-1', 'failed'),
      endedAt: '2026-06-02T00:01:00.000Z',
      terminalResult: terminalResult('failure')
    });
    if (!terminal.ok) throw new Error('expected terminal append to succeed');

    const superseding = appendStepAttempt(terminal.value, attempt('attempt-2', 'pending', 'attempt-1'));

    expect(superseding).toMatchObject({
      ok: true,
      value: {
        attempts: [
          { attemptId: 'attempt-1', status: 'failed' },
          { attemptId: 'attempt-2', status: 'pending', supersedesAttemptId: 'attempt-1' }
        ]
      }
    });
  });

  it('rejects terminal status mutation', () => {
    const terminal = appendStepAttempt(emptyManifest(), {
      ...attempt('attempt-1', 'pass'),
      endedAt: '2026-06-02T00:01:00.000Z',
      terminalResult: terminalResult('success')
    });
    if (!terminal.ok) throw new Error('expected terminal append to succeed');

    const result = transitionStepAttempt(terminal.value, {
      attemptId: 'attempt-1',
      status: 'failed',
      endedAt: '2026-06-02T00:02:00.000Z',
      terminalResult: terminalResult('failure')
    });

    expect(result).toMatchObject({
      ok: false,
      error: { name: 'InvalidSessionManifestMutation', path: '$.attempts[0].status' }
    });
    expect(terminal.value.attempts[0]?.status).toBe('pass');
  });

  it('redacts raw secrets and transcript-like data from appended audit records', () => {
    const result = appendAuditRecord(emptyManifest(), {
      auditId: 'audit-1',
      at: timestamp,
      event: 'manifest-write',
      step: 'specify',
      message: 'token=ghp_secret rawTranscript=full-log user@example.com'
    });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error('expected audit append to succeed');
    expect(result.value.audit[0]?.message).toBe('token=[REDACTED] rawTranscript=[REDACTED] [REDACTED_EMAIL]');
  });
});
