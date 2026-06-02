import { describe, expect, it } from 'vitest';
import recoveryScenariosFixture from '../../../../tests/fixtures/hybrid-manifest/recovery-scenarios.json';
import {
  SAFE_RECOVERY_CLASSES,
  createRecoveryActionResult,
  createSafeRecoveryRequest
} from './recoveryCatalog.factory';

const baseRequest = {
  recoveryClass: 'relocate-step-owned-artifact',
  step: 'specify',
  anomalyId: 'anomaly-001',
  idempotencyKey: 'recovery-001',
  requestedBy: 'deterministic',
  ambiguous: false,
  userConfirmed: false,
  ownership: {
    featureDir: 'specs/0013-hybrid-manifest-architecture',
    branch: 'build/manifest-architecture-dogfood',
    paths: ['specs/0013-hybrid-manifest-architecture/spec.md'],
    snapshotHash: 'abc123'
  },
  evidence: {
    sourcePath: 'specs/0012-old/spec.md',
    destinationPath: 'specs/0013-hybrid-manifest-architecture/spec.md'
  }
} as const;

describe('recoveryCatalog factory', () => {
  it('accepts exactly the six safe recovery classes from the catalog', () => {
    expect(SAFE_RECOVERY_CLASSES).toEqual([
      'relocate-step-owned-artifact',
      'adopt-valid-completion',
      'refresh-failed-marker',
      'revert-proven-unrelated-file',
      'cancel-observed-active-step',
      'restart-with-pinned-context'
    ]);

    for (const recoveryClass of SAFE_RECOVERY_CLASSES) {
      const request = createSafeRecoveryRequest({
        ...baseRequest,
        recoveryClass,
        requestedBy: recoveryClass === 'restart-with-pinned-context' ? 'user' : 'deterministic',
        userConfirmed: recoveryClass === 'restart-with-pinned-context'
      });

      expect(request).toMatchObject({
        ok: true,
        value: {
          recoveryClass,
          anomalyId: 'anomaly-001',
          ownership: baseRequest.ownership
        }
      });
    }
  });

  it('rejects every unsafe fixture class instead of normalizing it into a guarded action', () => {
    const unsafeClasses = new Set(
      recoveryScenariosFixture.scenarios
        .filter((scenario) => !scenario.safe)
        .map((scenario) => scenario.class)
    );

    for (const recoveryClass of unsafeClasses) {
      const request = createSafeRecoveryRequest({
        ...baseRequest,
        recoveryClass,
        ambiguous: false
      });

      expect(request).toMatchObject({
        ok: false,
        error: {
          name: 'InvalidRecoveryRequest',
          path: '$.recoveryClass'
        }
      });
    }
  });

  it('meets the SC-004 90% automatic safe-recovery threshold without false completion', () => {
    const safeScenarios = recoveryScenariosFixture.scenarios.filter((scenario) => scenario.safe);
    const automaticallyRecovered = safeScenarios.filter((scenario) =>
      scenario.expected.autoRecoverable === true &&
      scenario.expected.doctorInvoked === false &&
      scenario.expected.falseCompletion === false
    );
    const automaticPercent = (automaticallyRecovered.length / recoveryScenariosFixture.denominator.safe) * 100;

    expect(recoveryScenariosFixture.scenarios).toHaveLength(recoveryScenariosFixture.denominator.total);
    expect(safeScenarios).toHaveLength(recoveryScenariosFixture.denominator.safe);
    expect(automaticPercent).toBeGreaterThanOrEqual(
      recoveryScenariosFixture.denominator.automaticSafeRecoveryTargetPercent
    );
    expect(recoveryScenariosFixture.scenarios.every((scenario) => scenario.expected.falseCompletion === false)).toBe(true);
  });

  it('requires anomaly id, idempotency key, and step ownership evidence', () => {
    expect(createSafeRecoveryRequest({ ...baseRequest, anomalyId: '' })).toMatchObject({
      ok: false,
      error: { path: '$.anomalyId' }
    });
    expect(createSafeRecoveryRequest({ ...baseRequest, idempotencyKey: '  ' })).toMatchObject({
      ok: false,
      error: { path: '$.idempotencyKey' }
    });
    expect(createSafeRecoveryRequest({ ...baseRequest, ownership: { ...baseRequest.ownership, paths: [] } })).toMatchObject({
      ok: false,
      error: { path: '$.ownership.paths' }
    });
    expect(createSafeRecoveryRequest({ ...baseRequest, ownership: { ...baseRequest.ownership, branch: '' } })).toMatchObject({
      ok: false,
      error: { path: '$.ownership.branch' }
    });
  });

  it('rejects ambiguous requests and unexpected keys at the trust boundary', () => {
    expect(createSafeRecoveryRequest({ ...baseRequest, ambiguous: true })).toMatchObject({
      ok: false,
      error: {
        name: 'InvalidRecoveryRequest',
        path: '$.ambiguous'
      }
    });

    expect(createSafeRecoveryRequest({ ...baseRequest, extra: 'nope' })).toMatchObject({
      ok: false,
      error: {
        name: 'InvalidRecoveryRequest',
        path: '$.extra'
      }
    });

    expect(createSafeRecoveryRequest({
      ...baseRequest,
      ownership: { ...baseRequest.ownership, extra: 'nope' }
    })).toMatchObject({
      ok: false,
      error: {
        name: 'InvalidRecoveryRequest',
        path: '$.ownership.extra'
      }
    });
  });

  it('enforces doctor and user confirmation boundaries for restart-with-pinned-context', () => {
    expect(createSafeRecoveryRequest({
      ...baseRequest,
      recoveryClass: 'restart-with-pinned-context',
      requestedBy: 'deterministic',
      userConfirmed: false
    })).toMatchObject({
      ok: false,
      error: {
        path: '$.userConfirmed'
      }
    });

    expect(createSafeRecoveryRequest({
      ...baseRequest,
      recoveryClass: 'restart-with-pinned-context',
      requestedBy: 'user',
      userConfirmed: true
    })).toMatchObject({
      ok: true
    });

    expect(createSafeRecoveryRequest({
      ...baseRequest,
      recoveryClass: 'restart-with-pinned-context',
      requestedBy: 'doctor',
      userConfirmed: false,
      approvedDoctorRequestId: 'doctor-request-001'
    })).toMatchObject({
      ok: true
    });

    expect(createSafeRecoveryRequest({
      ...baseRequest,
      requestedBy: 'doctor',
      approvedDoctorRequestId: ''
    })).toMatchObject({
      ok: false,
      error: {
        path: '$.approvedDoctorRequestId'
      }
    });
  });

  it('creates strict recovery action results without allowing direct completion', () => {
    expect(createRecoveryActionResult({
      requestId: 'recovery-001',
      recoveryClass: 'refresh-failed-marker',
      anomalyId: 'anomaly-001',
      result: 'applied',
      interventionId: 'intervention-001',
      auditMessage: 'refreshed failed marker with anomaly evidence',
      doctorEscalated: false
    })).toMatchObject({
      ok: true,
      value: {
        result: 'applied',
        requiresReconciliation: true
      }
    });

    expect(createRecoveryActionResult({
      requestId: 'recovery-001',
      recoveryClass: 'refresh-failed-marker',
      anomalyId: 'anomaly-001',
      result: 'pass',
      interventionId: 'intervention-001',
      auditMessage: 'direct completion',
      doctorEscalated: false
    })).toMatchObject({
      ok: false,
      error: {
        path: '$.result'
      }
    });

    expect(createRecoveryActionResult({
      requestId: 'recovery-001',
      recoveryClass: 'refresh-failed-marker',
      anomalyId: 'anomaly-001',
      result: 'applied',
      interventionId: 'intervention-001',
      auditMessage: 'unexpected doctor escalation',
      doctorEscalated: true
    })).toMatchObject({
      ok: false,
      error: {
        path: '$.doctorEscalated'
      }
    });
  });
});
