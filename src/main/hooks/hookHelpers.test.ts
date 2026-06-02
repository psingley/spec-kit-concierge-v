import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runAfterHook, runBeforeHook, manifestForHook } from './hookHelpers';
import { STEP_ARTIFACT_MANIFEST } from './manifest';
import type { BranchStateSnapshot, StepOwnedArtifactSnapshot } from '../domain/manifest/types';
import type { StepHookContext } from './types';

vi.mock('../logging', () => ({
  createMainLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }))
}));

vi.mock('./prerequisiteGate', () => ({
  checkStepPrerequisites: vi.fn()
}));

const { checkStepPrerequisites } = await import('./prerequisiteGate');
const mockedGate = vi.mocked(checkStepPrerequisites);

const baseContext = (): StepHookContext => ({
  repositoryPath: '/repo',
  featureDir: '/repo/specs/0001',
  sessionId: 's1',
  userDataPath: '/tmp/user',
  now: () => new Date('2026-05-27T00:00:00.000Z')
});

describe('hookHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGate.mockResolvedValue({ ok: true });
  });

  it('runs before hook gate, marker write, and activity sink paths', async () => {
    const writeInFlightMarker = vi.fn().mockResolvedValue(undefined);
    const activitySink = vi.fn();

    const result = await runBeforeHook('specify', { ...baseContext(), writeInFlightMarker, activitySink });

    expect(mockedGate).toHaveBeenCalledWith('specify', expect.objectContaining({ sessionId: 's1' }));
    expect(writeInFlightMarker).toHaveBeenCalledWith('s1', 'specify');
    expect(activitySink).toHaveBeenCalledWith(expect.objectContaining({ event: 'step-pending', step: 'specify' }));
    expect(result).toMatchObject({ ok: true, phase: 'before', step: 'specify', lifecycleAction: 'pending' });
  });

  it('captures branch state and owned-path snapshots before pending activity', async () => {
    const events: string[] = [];
    const branchBefore: BranchStateSnapshot = {
      branch: 'build/manifest-architecture-dogfood',
      headSha: '1'.repeat(40),
      statusPorcelain: '',
      trackedChanges: [],
      timestamp: '2026-05-27T00:00:00.000Z'
    };
    const ownedPathSnapshot: StepOwnedArtifactSnapshot = {
      step: 'plan',
      featureDir: '/repo/specs/0001',
      paths: [{ path: 'plan.md', required: true, present: false }],
      snapshotHash: 'a'.repeat(64),
      capturedAt: '2026-05-27T00:00:00.000Z'
    };
    const captureBranchState = vi.fn(async () => {
      events.push('branch');
      return branchBefore;
    });
    const captureOwnedPathSnapshot = vi.fn(async () => {
      events.push('owned-paths');
      return ownedPathSnapshot;
    });
    const stepStartSnapshotSink = vi.fn(async () => {
      events.push('snapshot-sink');
    });
    const writeInFlightMarker = vi.fn(async () => {
      events.push('marker');
    });
    const activitySink = vi.fn(async () => {
      events.push('activity');
    });

    const result = await runBeforeHook('plan', {
      ...baseContext(),
      captureBranchState,
      captureOwnedPathSnapshot,
      stepStartSnapshotSink,
      writeInFlightMarker,
      activitySink
    });

    expect(events).toEqual(['branch', 'owned-paths', 'snapshot-sink', 'marker', 'activity']);
    expect(captureBranchState).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 's1' }));
    expect(captureOwnedPathSnapshot).toHaveBeenCalledWith('plan', expect.objectContaining({ featureDir: '/repo/specs/0001' }), branchBefore);
    expect(stepStartSnapshotSink).toHaveBeenCalledWith({
      step: 'plan',
      branchBefore,
      ownedPathSnapshot
    });
    expect(result).toMatchObject({
      ok: true,
      stepStartSnapshot: { branchBefore, ownedPathSnapshot }
    });
  });

  it('returns escape hatch when prerequisite gate closes', async () => {
    mockedGate.mockResolvedValue({ ok: false, escapeHatchReason: 'prerequisite-missing', missingStep: 'specify' });
    const writeInFlightMarker = vi.fn();
    const activitySink = vi.fn();

    const result = await runBeforeHook('plan', { ...baseContext(), writeInFlightMarker, activitySink });

    expect(result).toMatchObject({ ok: false, phase: 'before', step: 'plan', escapeHatchReason: 'prerequisite-missing' });
    expect(writeInFlightMarker).not.toHaveBeenCalled();
    expect(activitySink).not.toHaveBeenCalled();
  });

  it('returns hook-failed when before marker write throws', async () => {
    const error = new Error('marker down');
    const writeInFlightMarker = vi.fn().mockRejectedValue(error);

    const result = await runBeforeHook('tasks', { ...baseContext(), writeInFlightMarker });

    expect(result).toMatchObject({ ok: false, phase: 'before', step: 'tasks', escapeHatchReason: 'hook-failed' });
    expect((result as { error?: unknown }).error).toBe(error);
    expect(writeInFlightMarker).toHaveBeenCalledTimes(1);
  });

  it('runs after hook validator, commit writer, marker remove, and activity sink paths', async () => {
    const validateArtifacts = vi.fn().mockResolvedValue({
      ok: true,
      commit: { step: 'analyze', status: 'pass', files: [], message: 'Concierge analyze step', allowEmptyCommit: true }
    });
    const commitWithTrailer = vi.fn().mockResolvedValue({ commitSha: 'abc123' });
    const removeInFlightMarker = vi.fn().mockResolvedValue(undefined);
    const activitySink = vi.fn();

    const result = await runAfterHook('analyze', { ...baseContext(), validateArtifacts, commitWithTrailer, removeInFlightMarker, activitySink });

    expect(validateArtifacts).toHaveBeenCalledWith('/repo/specs/0001', expect.objectContaining({ sessionId: 's1' }));
    expect(commitWithTrailer).toHaveBeenCalledWith('/repo', expect.objectContaining({ step: 'analyze' }));
    expect(removeInFlightMarker).toHaveBeenCalledWith('s1', 'analyze');
    expect(result).toMatchObject({ ok: true, phase: 'after', step: 'analyze', lifecycleAction: 'complete', commit: { commitSha: 'abc123' } });
  });

  it('runs pre-commit and post-commit reconciliation around after-hook commit writes', async () => {
    const events: string[] = [];
    const validateArtifacts = vi.fn(async () => {
      events.push('validate');
      return {
        ok: true as const,
        commit: {
          step: 'specify' as const,
          status: 'pass' as const,
          files: ['spec.md'],
          message: 'Concierge specify step',
          artifactSnapshotHash: 'a'.repeat(64)
        }
      };
    });
    const reconcileAfterHook = vi.fn(async (phase: 'pre-commit' | 'post-commit') => {
      events.push(phase);
      return phase === 'pre-commit'
        ? { step: 'specify' as const, status: 'pending' as const, canCommit: true, canAutoRecover: false, canNudge: false, anomalies: [], requiredInterventions: [] }
        : { step: 'specify' as const, status: 'pass' as const, canCommit: false, canAutoRecover: false, canNudge: false, anomalies: [], requiredInterventions: [] };
    });
    const commitWithTrailer = vi.fn(async () => {
      events.push('commit');
      return { commitSha: 'abc123', trailer: 'Concierge-Step: specify:pass' };
    });
    const removeInFlightMarker = vi.fn(async () => {
      events.push('remove-marker');
    });

    const result = await runAfterHook('specify', {
      ...baseContext(),
      validateArtifacts,
      reconcileAfterHook,
      commitWithTrailer,
      removeInFlightMarker
    });

    expect(events).toEqual(['validate', 'pre-commit', 'commit', 'post-commit', 'remove-marker']);
    expect(reconcileAfterHook).toHaveBeenCalledWith('pre-commit', expect.objectContaining({
      step: 'specify',
      commitCandidate: expect.objectContaining({ artifactSnapshotHash: 'a'.repeat(64) })
    }));
    expect(reconcileAfterHook).toHaveBeenCalledWith('post-commit', expect.objectContaining({
      step: 'specify',
      commitResult: expect.objectContaining({ commitSha: 'abc123' })
    }));
    expect(result).toMatchObject({ ok: true, lifecycleAction: 'complete' });
  });

  it('blocks after-hook commit when pre-commit reconciliation disallows commit', async () => {
    const validateArtifacts = vi.fn().mockResolvedValue({
      ok: true,
      commit: { step: 'specify', status: 'pass', files: ['spec.md'], message: 'Concierge specify step' }
    });
    const reconcileAfterHook = vi.fn().mockResolvedValue({
      step: 'specify',
      status: 'pending',
      canCommit: false,
      canAutoRecover: true,
      canNudge: false,
      anomalies: [],
      requiredInterventions: ['anomaly-1']
    });
    const commitWithTrailer = vi.fn();

    const result = await runAfterHook('specify', {
      ...baseContext(),
      validateArtifacts,
      reconcileAfterHook,
      writeFailedStepMarker: vi.fn().mockResolvedValue(undefined),
      commitWithTrailer
    });

    expect(result).toMatchObject({
      ok: false,
      phase: 'after',
      step: 'specify',
      escapeHatchReason: 'factory-rejected',
      failureReason: 'pre-commit reconciliation blocked completion'
    });
    expect(commitWithTrailer).not.toHaveBeenCalled();
  });

  it('persists failed marker detail when reconciliation blocks after-hook completion', async () => {
    const validateArtifacts = vi.fn().mockResolvedValue({
      ok: true,
      commit: { step: 'tasks', status: 'pass', files: ['tasks.md'], message: 'Concierge tasks step' }
    });
    const reconcileAfterHook = vi.fn().mockResolvedValue({
      step: 'tasks',
      status: 'needs-attention',
      canCommit: false,
      canAutoRecover: true,
      canNudge: true,
      anomalies: [{
        anomalyId: 'anomaly-1',
        step: 'tasks',
        kind: 'unrelated-diff',
        severity: 'blocking',
        detectedAt: '2026-06-02T00:00:00.000Z',
        evidence: { strandedArtifacts: ['src/main/ipc/passiveStepIpc.ts'] }
      }],
      requiredInterventions: ['anomaly-1']
    });
    const writeFailedStepMarker = vi.fn().mockResolvedValue(undefined);

    const result = await runAfterHook('tasks', {
      ...baseContext(),
      validateArtifacts,
      reconcileAfterHook,
      writeFailedStepMarker
    });

    expect(result).toMatchObject({
      ok: false,
      escapeHatchReason: 'factory-rejected',
      failureReason: 'pre-commit reconciliation blocked completion'
    });
    expect(writeFailedStepMarker).toHaveBeenCalledWith(expect.objectContaining({
      repositoryPath: '/repo',
      userDataPath: '/tmp/user',
      step: 'tasks',
      sessionId: 's1',
      reason: 'pre-commit reconciliation blocked completion',
      anomalyIds: ['anomaly-1'],
      strandedArtifacts: ['src/main/ipc/passiveStepIpc.ts']
    }));
  });

  it('returns clarify-specific escape hatch for malformed question validation', async () => {
    const validateArtifacts = vi.fn().mockResolvedValue({ ok: false, kind: 'malformed-questions', wellFormedQuestions: [], malformedQuestions: [], rawText: 'bad' });
    const commitWithTrailer = vi.fn();

    const result = await runAfterHook('clarify', { ...baseContext(), validateArtifacts, commitWithTrailer });

    expect(result).toMatchObject({ ok: false, phase: 'after', step: 'clarify', escapeHatchReason: 'clarify-malformed' });
    expect(validateArtifacts).toHaveBeenCalledTimes(1);
    expect(commitWithTrailer).not.toHaveBeenCalled();
  });

  it('returns hook-failed when after hook commit throws', async () => {
    const error = new Error('commit failed');
    const validateArtifacts = vi.fn().mockResolvedValue({
      ok: true,
      commit: { step: 'tasks', status: 'pass', files: ['tasks.md'], message: 'Concierge tasks step' }
    });
    const commitWithTrailer = vi.fn().mockRejectedValue(error);

    const result = await runAfterHook('tasks', { ...baseContext(), validateArtifacts, commitWithTrailer });

    expect(result).toMatchObject({ ok: false, phase: 'after', step: 'tasks', escapeHatchReason: 'hook-failed' });
    expect((result as { error?: unknown }).error).toBe(error);
    expect(commitWithTrailer).toHaveBeenCalledTimes(1);
  });

  it('treats review as a non-committing terminal hook', async () => {
    const validateArtifacts = vi.fn();
    const commitWithTrailer = vi.fn();
    const activitySink = vi.fn();

    const result = await runAfterHook('review', { ...baseContext(), validateArtifacts, commitWithTrailer, activitySink });

    expect(result).toMatchObject({ ok: true, phase: 'after', step: 'review', lifecycleAction: 'complete' });
    expect(result).not.toHaveProperty('commit');
    expect(validateArtifacts).not.toHaveBeenCalled();
    expect(commitWithTrailer).not.toHaveBeenCalled();
    expect(activitySink).toHaveBeenCalledWith(expect.objectContaining({ event: 'step-complete', step: 'review' }));
  });

  it('exposes manifest entries for hook callers', () => {
    const manifest = manifestForHook('plan');

    expect(manifest.requiredFiles).toContain('plan.md');
    expect(manifest.requiredFiles).toContain('research.md');
    expect(STEP_ARTIFACT_MANIFEST.plan.contextFileException).toBe(true);
  });
});
