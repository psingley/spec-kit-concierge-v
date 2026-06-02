import {
  type Anomaly,
  type AuditRecord,
  type BranchStateSnapshot,
  type CompletionEvidence,
  type Intervention,
  type SessionManifestV1,
  type StepAttempt,
  type StepAttemptStatus,
  type TerminalResult
} from './types';
import { invalid, type ManifestFactoryResult } from './factoryUtils';

type MutationErrorName = 'InvalidSessionManifestMutation';
type MutationResult = ManifestFactoryResult<SessionManifestV1, MutationErrorName>;

type StepAttemptTransition = {
  attemptId: string;
  status: StepAttemptStatus;
  endedAt?: string;
  branchAfter?: BranchStateSnapshot;
  terminalResult?: TerminalResult;
  completionEvidence?: CompletionEvidence;
  anomalyIds?: string[];
  interventionIds?: string[];
};

const terminalStatuses = ['pass', 'failed', 'killed', 'interrupted'] as const;

const isTerminalStatus = (status: StepAttemptStatus): boolean =>
  terminalStatuses.includes(status as (typeof terminalStatuses)[number]);

const redactAuditMessage = (message: string): string =>
  message
    .replace(/\b(token|secret|authorization)=\S+/gi, '$1=[REDACTED]')
    .replace(/\brawTranscript=\S+/gi, 'rawTranscript=[REDACTED]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');

const withUpdatedAt = (manifest: SessionManifestV1, updatedAt: string): SessionManifestV1 => ({
  ...manifest,
  updatedAt
});

export const appendStepAttempt = (
  manifest: SessionManifestV1,
  attempt: StepAttempt
): MutationResult => {
  if (manifest.attempts.some((existing) => existing.attemptId === attempt.attemptId)) {
    return invalid('InvalidSessionManifestMutation', 'attempt id already exists', '$.attempts');
  }

  if (
    attempt.supersedesAttemptId !== undefined &&
    !manifest.attempts.some((existing) => existing.attemptId === attempt.supersedesAttemptId && isTerminalStatus(existing.status))
  ) {
    return invalid('InvalidSessionManifestMutation', 'superseded attempt must be terminal', '$.attempts');
  }

  return {
    ok: true,
    value: withUpdatedAt({
      ...manifest,
      attempts: [...manifest.attempts, attempt]
    }, attempt.endedAt ?? attempt.startedAt)
  };
};

export const transitionStepAttempt = (
  manifest: SessionManifestV1,
  transition: StepAttemptTransition
): MutationResult => {
  const attemptIndex = manifest.attempts.findIndex((attempt) => attempt.attemptId === transition.attemptId);
  if (attemptIndex < 0) {
    return invalid('InvalidSessionManifestMutation', 'attempt not found', '$.attempts');
  }

  const existing = manifest.attempts[attemptIndex];
  if (existing === undefined) {
    return invalid('InvalidSessionManifestMutation', 'attempt not found', '$.attempts');
  }

  if (isTerminalStatus(existing.status)) {
    return invalid('InvalidSessionManifestMutation', 'terminal attempts are immutable', `$.attempts[${attemptIndex}].status`);
  }

  if (existing.status === 'pending' && transition.status !== 'running') {
    return invalid('InvalidSessionManifestMutation', 'pending attempts may only transition to running', `$.attempts[${attemptIndex}].status`);
  }

  if (existing.status === 'running' && transition.status === 'pending') {
    return invalid('InvalidSessionManifestMutation', 'running attempts cannot return to pending', `$.attempts[${attemptIndex}].status`);
  }

  if (isTerminalStatus(transition.status) && (transition.endedAt === undefined || transition.terminalResult === undefined)) {
    return invalid('InvalidSessionManifestMutation', 'terminal transitions require endedAt and terminalResult', `$.attempts[${attemptIndex}].status`);
  }

  const updatedAttempt: StepAttempt = {
    ...existing,
    status: transition.status,
    ...(transition.endedAt === undefined ? {} : { endedAt: transition.endedAt }),
    ...(transition.branchAfter === undefined ? {} : { branchAfter: transition.branchAfter }),
    ...(transition.terminalResult === undefined ? {} : { terminalResult: transition.terminalResult }),
    ...(transition.completionEvidence === undefined ? {} : { completionEvidence: transition.completionEvidence }),
    anomalyIds: transition.anomalyIds ?? existing.anomalyIds,
    interventionIds: transition.interventionIds ?? existing.interventionIds
  };

  return {
    ok: true,
    value: withUpdatedAt({
      ...manifest,
      attempts: manifest.attempts.map((attempt, index) => (index === attemptIndex ? updatedAttempt : attempt))
    }, transition.endedAt ?? transition.branchAfter?.timestamp ?? manifest.updatedAt)
  };
};

export const appendAnomalyRecord = (
  manifest: SessionManifestV1,
  anomaly: Anomaly
): MutationResult => {
  if (manifest.anomalies.some((existing) => existing.anomalyId === anomaly.anomalyId)) {
    return invalid('InvalidSessionManifestMutation', 'anomaly id already exists', '$.anomalies');
  }

  return {
    ok: true,
    value: withUpdatedAt({
      ...manifest,
      anomalies: [...manifest.anomalies, anomaly]
    }, anomaly.detectedAt)
  };
};

export const appendInterventionRecord = (
  manifest: SessionManifestV1,
  intervention: Intervention
): MutationResult => {
  if (manifest.interventions.some((existing) => existing.interventionId === intervention.interventionId)) {
    return invalid('InvalidSessionManifestMutation', 'intervention id already exists', '$.interventions');
  }

  return {
    ok: true,
    value: withUpdatedAt({
      ...manifest,
      interventions: [...manifest.interventions, intervention]
    }, intervention.endedAt)
  };
};

export const appendAuditRecord = (
  manifest: SessionManifestV1,
  audit: AuditRecord
): MutationResult => {
  if (manifest.audit.some((existing) => existing.auditId === audit.auditId)) {
    return invalid('InvalidSessionManifestMutation', 'audit id already exists', '$.audit');
  }

  const redactedAudit: AuditRecord = {
    ...audit,
    message: redactAuditMessage(audit.message)
  };

  return {
    ok: true,
    value: withUpdatedAt({
      ...manifest,
      audit: [...manifest.audit, redactedAudit]
    }, audit.at)
  };
};
