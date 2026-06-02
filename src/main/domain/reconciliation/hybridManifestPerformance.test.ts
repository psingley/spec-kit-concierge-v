import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSessionManifest } from '../manifest/sessionManifest.factory';
import type { StepName } from '../manifest/types';
import { reconcileSessionStep } from './sessionReconciler';

const stepOrder: StepName[] = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'];

describe('hybrid manifest performance budgets', () => {
  it('reads the max manifest fixture and reconciles every step within the 500 ms SC-001 budget', async () => {
    const fixturePath = path.join(process.cwd(), 'tests/fixtures/hybrid-manifest/session-manifest.max.json');
    const startedAt = performance.now();
    const payload = JSON.parse(await readFile(fixturePath, 'utf8')) as unknown;
    const parsed = createSessionManifest(payload);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const results = stepOrder.map((step) => {
      const attempt = [...parsed.value.attempts].reverse().find((candidate) => candidate.step === step);
      if (attempt === undefined) {
        throw new Error(`max fixture missing attempt for ${step}`);
      }
      return reconcileSessionStep({
        manifest: parsed.value,
        step,
        currentArtifactSnapshot: attempt.ownedPathSnapshot,
        completionHistory: attempt.completionEvidence === undefined ? [] : [{
          step,
          status: 'pass',
          commitSha: attempt.completionEvidence.commitSha,
          artifactSnapshotHash: attempt.completionEvidence.artifactSnapshot.snapshotHash,
          warnings: []
        }]
      });
    });
    const elapsedMs = performance.now() - startedAt;

    expect(results).toHaveLength(6);
    expect(elapsedMs).toBeLessThanOrEqual(500);
  });
});
