import { describe, expect, it } from 'vitest';
import { STEP_ARTIFACT_MANIFEST, STEP_NAMES, expectedArtifactsForStep, isStepName } from './manifest';

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
});
