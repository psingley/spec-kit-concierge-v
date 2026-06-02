import { describe, expect, it } from 'vitest';
import { STEP_ARTIFACT_MANIFEST, STEP_NAMES, expectedArtifactsForStep, ownedArtifactsForStep, isStepName } from './manifest';

describe('hook manifest', () => {
  it('declares the supported step names in lifecycle order', () => {
    expect(STEP_NAMES).toHaveLength(6);
    expect(STEP_NAMES[0]).toBe('specify');
    expect(STEP_NAMES[5]).toBe('review');
  });

  it('identifies valid and invalid step names', () => {
    expect(isStepName('plan')).toBe(true);
    expect(isStepName('deploy')).toBe(false);
    expect(isStepName('')).toBe(false);
  });

  it('returns required and optional artifacts for a step', () => {
    const artifacts = expectedArtifactsForStep('specify');

    expect(artifacts).toContain('spec.md');
    expect(artifacts).toContain('checklists/requirements.md');
    expect(artifacts).toHaveLength(2);
  });

  it('adds context file exception artifacts for plan', () => {
    const artifacts = expectedArtifactsForStep('plan', 'CONTEXT.md');

    expect(STEP_ARTIFACT_MANIFEST.plan.contextFileException).toBe(true);
    expect(artifacts).toContain('plan.md');
    expect(artifacts).toContain('CONTEXT.md');
  });

  it('declares analyze as bounded remediation with no required analyze artifact', () => {
    const artifacts = expectedArtifactsForStep('analyze');

    expect(STEP_ARTIFACT_MANIFEST.analyze.requiredFiles).toEqual([]);
    expect(STEP_ARTIFACT_MANIFEST.analyze.remediationFiles).toEqual(['spec.md', 'plan.md', 'tasks.md']);
    expect(STEP_ARTIFACT_MANIFEST.analyze.allowEmptyCommit).toBe(true);
    expect(artifacts).toEqual(['spec.md', 'plan.md', 'tasks.md']);
    expect(artifacts).not.toContain('analyze.md');
  });

  it('declares required, optional, and context-exception ownership for every step', () => {
    for (const step of STEP_NAMES) {
      expect(ownedArtifactsForStep(step, 'CONTEXT.md')).toEqual(
        expect.arrayContaining(
          expectedArtifactsForStep(step, 'CONTEXT.md').map((artifact) =>
            expect.objectContaining({ path: artifact, required: expect.any(Boolean) })
          )
        )
      );
    }

    expect(ownedArtifactsForStep('specify')).toEqual([
      { path: 'spec.md', required: true },
      { path: 'checklists/requirements.md', required: false }
    ]);
    expect(ownedArtifactsForStep('plan', 'CONTEXT.md')).toContainEqual({
      path: 'CONTEXT.md',
      required: false,
      contextFileException: true
    });
    expect(ownedArtifactsForStep('analyze')).toEqual([
      { path: 'spec.md', required: false, remediation: true },
      { path: 'plan.md', required: false, remediation: true },
      { path: 'tasks.md', required: false, remediation: true }
    ]);
  });
});
