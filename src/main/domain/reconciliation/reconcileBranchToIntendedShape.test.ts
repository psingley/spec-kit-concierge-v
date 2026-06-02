import { describe, expect, it } from 'vitest';
import { reconcileBranchToIntendedShape } from './reconcileBranchToIntendedShape';

const base = {
  step: 'tasks',
  status: 'needs-attention',
  branchBefore: 'build/manifest-architecture-dogfood',
  currentBranch: 'build/manifest-architecture-dogfood',
  anomalies: [{ anomalyId: 'a1', kind: 'misplaced-artifact', ambiguous: false }],
  safeActions: [{ action: 'relocateArtifact', anomalyId: 'a1' }]
} as const;

describe('reconcileBranchToIntendedShape', () => {
  it('plans unambiguous repair without direct completion marking', () => {
    expect(reconcileBranchToIntendedShape(base)).toEqual({
      result: 'repaired',
      actions: [{ action: 'relocateArtifact', anomalyId: 'a1' }],
      markComplete: false,
      message: 'Planned 1 deterministic repair action'
    });
  });

  it('returns no-op for already healthy sessions', () => {
    expect(reconcileBranchToIntendedShape({ ...base, status: 'pass', anomalies: [], safeActions: [] })).toMatchObject({
      result: 'no-op',
      markComplete: false
    });
  });

  it('rejects stale branch preconditions and escalates ambiguity', () => {
    expect(reconcileBranchToIntendedShape({ ...base, currentBranch: 'other' })).toMatchObject({
      result: 'rejected',
      markComplete: false
    });
    expect(reconcileBranchToIntendedShape({ ...base, anomalies: [{ anomalyId: 'a2', kind: 'conflicting-evidence', ambiguous: true }], safeActions: [] })).toMatchObject({
      result: 'escalated',
      markComplete: false
    });
  });
});
