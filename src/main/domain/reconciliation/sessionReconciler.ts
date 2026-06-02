import type { FailedStepRecord } from '../../data-layer/failedSteps';
import type { StepCompletionHistoryRecord } from '../../data-layer/git/stepCompletionHistory';
import {
  type Anomaly,
  type ReconciliationResult,
  type SessionManifestV1,
  type StepAttempt,
  type StepName,
  type StepOwnedArtifactSnapshot
} from '../manifest/types';

export type ReconcileSessionStepRequest = {
  manifest: SessionManifestV1;
  step: StepName;
  currentArtifactSnapshot: StepOwnedArtifactSnapshot;
  completionHistory: StepCompletionHistoryRecord[];
  failedMarker?: FailedStepRecord;
};

const latestAttemptForStep = (
  manifest: SessionManifestV1,
  step: StepName
): StepAttempt | undefined => {
  const superseded = new Set(
    manifest.attempts
      .map((attempt) => attempt.supersedesAttemptId)
      .filter((attemptId): attemptId is string => attemptId !== undefined)
  );

  return [...manifest.attempts]
    .reverse()
    .find((attempt) => attempt.step === step && !superseded.has(attempt.attemptId));
};

const hasMissingRequiredArtifact = (snapshot: StepOwnedArtifactSnapshot): boolean =>
  snapshot.paths.some((artifact) => artifact.required && !artifact.present);

const unresolvedBlockingAnomalies = (
  manifest: SessionManifestV1,
  step: StepName
): Anomaly[] =>
  manifest.anomalies.filter((anomaly) =>
    anomaly.step === step &&
    anomaly.severity === 'blocking' &&
    anomaly.resolvedByInterventionId === undefined
  );

const syntheticAnomaly = (
  manifest: SessionManifestV1,
  step: StepName,
  kind: Anomaly['kind'],
  evidence: Record<string, unknown>
): Anomaly => ({
  anomalyId: `${step}-${kind}-${manifest.updatedAt}`,
  step,
  kind,
  severity: 'blocking',
  detectedAt: manifest.updatedAt,
  evidence
});

const baseResult = (
  step: StepName,
  status: ReconciliationResult['status'],
  anomalies: Anomaly[] = []
): ReconciliationResult => ({
  step,
  status,
  canCommit: false,
  canAutoRecover: anomalies.length > 0,
  canNudge: false,
  anomalies,
  requiredInterventions: anomalies
    .filter((anomaly) => anomaly.severity === 'blocking')
    .map((anomaly) => anomaly.anomalyId)
});

export const reconcileSessionStep = (
  request: ReconcileSessionStepRequest
): ReconciliationResult => {
  const attempt = latestAttemptForStep(request.manifest, request.step);
  const unresolved = unresolvedBlockingAnomalies(request.manifest, request.step);

  if (attempt === undefined) {
    return baseResult(request.step, 'pending', unresolved);
  }

  if (hasMissingRequiredArtifact(request.currentArtifactSnapshot)) {
    return baseResult(request.step, 'pending', [
      ...unresolved,
      syntheticAnomaly(request.manifest, request.step, 'missing-artifact', {
        snapshotHash: request.currentArtifactSnapshot.snapshotHash
      })
    ]);
  }

  if (unresolved.length > 0) {
    return baseResult(request.step, 'pending', unresolved);
  }

  if (attempt.status === 'pending' || attempt.status === 'running') {
    return baseResult(request.step, attempt.status);
  }

  if (attempt.status !== 'pass') {
    if (attempt.status === 'failed' && request.failedMarker !== undefined) {
      return { ...baseResult(request.step, 'needs-attention'), canNudge: true };
    }
    return baseResult(request.step, attempt.status);
  }

  if (
    attempt.terminalResult === undefined ||
    attempt.terminalResult.resultKind !== 'success' ||
    attempt.completionEvidence === undefined
  ) {
    return baseResult(request.step, 'pending');
  }

  if (
    attempt.completionEvidence.artifactSnapshot.snapshotHash !== request.currentArtifactSnapshot.snapshotHash
  ) {
    return baseResult(request.step, 'pending', [
      syntheticAnomaly(request.manifest, request.step, 'conflicting-evidence', {
        expectedSnapshotHash: attempt.completionEvidence.artifactSnapshot.snapshotHash,
        currentSnapshotHash: request.currentArtifactSnapshot.snapshotHash
      })
    ]);
  }

  const matchingHistory = request.completionHistory.find((record) =>
    record.step === request.step &&
    record.status === 'pass' &&
    record.artifactSnapshotHash === request.currentArtifactSnapshot.snapshotHash
  );

  if (matchingHistory === undefined) {
    const hasMismatchedHistory = request.completionHistory.some((record) =>
      record.step === request.step &&
      record.status === 'pass' &&
      record.artifactSnapshotHash !== request.currentArtifactSnapshot.snapshotHash
    );

    if (hasMismatchedHistory) {
      return baseResult(request.step, 'pending', [
        syntheticAnomaly(request.manifest, request.step, 'conflicting-evidence', {
          currentSnapshotHash: request.currentArtifactSnapshot.snapshotHash
        })
      ]);
    }

    return {
      ...baseResult(request.step, 'pending'),
      canCommit: true
    };
  }

  return {
    ...baseResult(request.step, 'pass'),
    completionEvidence: {
      ...attempt.completionEvidence,
      commitSha: matchingHistory.commitSha,
      adoptedFromHistory: matchingHistory.commitSha !== attempt.completionEvidence.commitSha
    }
  };
};
