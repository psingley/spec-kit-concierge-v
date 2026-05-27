import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runAfterHook, runBeforeHook, manifestForHook } from './hookHelpers';
import { STEP_ARTIFACT_MANIFEST } from './manifest';
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
      commit: { step: 'analyze', status: 'pass', files: ['analyze.md'], message: 'Concierge analyze step' }
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
      commit: { step: 'review', status: 'pass', files: [], message: 'Concierge review step' }
    });
    const commitWithTrailer = vi.fn().mockRejectedValue(error);

    const result = await runAfterHook('review', { ...baseContext(), validateArtifacts, commitWithTrailer });

    expect(result).toMatchObject({ ok: false, phase: 'after', step: 'review', escapeHatchReason: 'hook-failed' });
    expect((result as { error?: unknown }).error).toBe(error);
    expect(commitWithTrailer).toHaveBeenCalledTimes(1);
  });

  it('exposes manifest entries for hook callers', () => {
    const manifest = manifestForHook('plan');

    expect(manifest.requiredFiles).toContain('plan.md');
    expect(manifest.requiredFiles).toContain('research.md');
    expect(STEP_ARTIFACT_MANIFEST.plan.contextFileException).toBe(true);
  });
});
