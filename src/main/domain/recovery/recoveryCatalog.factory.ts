import {
  invalid,
  rejectUnknownKeys,
  requireNonEmptyString,
  requireRecord,
  requireStepName,
  type ManifestFactoryResult
} from '../manifest/factoryUtils';
import { INTERVENTION_RESULTS, type InterventionResult, type StepName } from '../manifest/types';

export const SAFE_RECOVERY_CLASSES = [
  'relocate-step-owned-artifact',
  'adopt-valid-completion',
  'refresh-failed-marker',
  'revert-proven-unrelated-file',
  'cancel-observed-active-step',
  'restart-with-pinned-context'
] as const;

export type SafeRecoveryClass = (typeof SAFE_RECOVERY_CLASSES)[number];
export type RecoveryRequestSource = 'deterministic' | 'user' | 'doctor';
export type RecoveryFactoryErrorName = 'InvalidRecoveryRequest' | 'InvalidRecoveryResult';

export type RecoveryOwnershipEvidence = {
  featureDir: string;
  branch: string;
  paths: string[];
  snapshotHash: string;
};

export type SafeRecoveryRequest = {
  recoveryClass: SafeRecoveryClass;
  step: StepName;
  anomalyId: string;
  idempotencyKey: string;
  requestedBy: RecoveryRequestSource;
  ambiguous: false;
  userConfirmed: boolean;
  approvedDoctorRequestId?: string;
  ownership: RecoveryOwnershipEvidence;
  evidence: Record<string, unknown>;
};

export type RecoveryActionResult = {
  requestId: string;
  recoveryClass: SafeRecoveryClass;
  anomalyId: string;
  result: InterventionResult;
  interventionId: string;
  auditMessage: string;
  doctorEscalated: boolean;
  requiresReconciliation: true;
};

const isSafeRecoveryClass = (value: unknown): value is SafeRecoveryClass =>
  typeof value === 'string' && SAFE_RECOVERY_CLASSES.includes(value as SafeRecoveryClass);

const isRecoveryRequestSource = (value: unknown): value is RecoveryRequestSource =>
  value === 'deterministic' || value === 'user' || value === 'doctor';

const isInterventionResult = (value: unknown): value is InterventionResult =>
  typeof value === 'string' && INTERVENTION_RESULTS.includes(value as InterventionResult);

const requireBoolean = (
  value: unknown,
  path: string
): ManifestFactoryResult<boolean, 'InvalidRecoveryRequest'> =>
  typeof value === 'boolean'
    ? { ok: true, value }
    : invalid('InvalidRecoveryRequest', 'must be a boolean', path);

const requirePathArray = (
  value: unknown,
  path: string
): ManifestFactoryResult<string[], 'InvalidRecoveryRequest'> => {
  if (!Array.isArray(value) || value.length === 0) {
    return invalid('InvalidRecoveryRequest', 'must be a non-empty string array', path);
  }

  const paths: string[] = [];
  for (const [index, item] of value.entries()) {
    const parsed = requireNonEmptyString(item, 'InvalidRecoveryRequest', `${path}[${index}]`);
    if (!parsed.ok) return parsed;
    paths.push(parsed.value);
  }

  return { ok: true, value: paths };
};

const parseRecoveryClass = <Name extends RecoveryFactoryErrorName>(
  value: unknown,
  path: string,
  name: Name
): ManifestFactoryResult<SafeRecoveryClass, Name> =>
  isSafeRecoveryClass(value)
    ? { ok: true, value }
    : invalid(name, 'must be a safe recovery class', path);

const parseOwnership = (
  value: unknown
): ManifestFactoryResult<RecoveryOwnershipEvidence, 'InvalidRecoveryRequest'> => {
  const root = requireRecord(value, 'InvalidRecoveryRequest', '$.ownership');
  if (!root.ok) return root;

  const keys = rejectUnknownKeys(
    root.value,
    ['featureDir', 'branch', 'paths', 'snapshotHash'],
    'InvalidRecoveryRequest',
    '$.ownership'
  );
  if (!keys.ok) return keys;

  const featureDir = requireNonEmptyString(root.value.featureDir, 'InvalidRecoveryRequest', '$.ownership.featureDir');
  if (!featureDir.ok) return featureDir;
  const branch = requireNonEmptyString(root.value.branch, 'InvalidRecoveryRequest', '$.ownership.branch');
  if (!branch.ok) return branch;
  const paths = requirePathArray(root.value.paths, '$.ownership.paths');
  if (!paths.ok) return paths;
  const snapshotHash = requireNonEmptyString(root.value.snapshotHash, 'InvalidRecoveryRequest', '$.ownership.snapshotHash');
  if (!snapshotHash.ok) return snapshotHash;

  return {
    ok: true,
    value: {
      featureDir: featureDir.value,
      branch: branch.value,
      paths: paths.value,
      snapshotHash: snapshotHash.value
    }
  };
};

export const createSafeRecoveryRequest = (
  value: unknown
): ManifestFactoryResult<SafeRecoveryRequest, 'InvalidRecoveryRequest'> => {
  const root = requireRecord(value, 'InvalidRecoveryRequest', '$');
  if (!root.ok) return root;

  const keys = rejectUnknownKeys(
    root.value,
    [
      'recoveryClass',
      'step',
      'anomalyId',
      'idempotencyKey',
      'requestedBy',
      'ambiguous',
      'userConfirmed',
      'approvedDoctorRequestId',
      'ownership',
      'evidence'
    ],
    'InvalidRecoveryRequest',
    '$'
  );
  if (!keys.ok) return keys;

  const recoveryClass = parseRecoveryClass(root.value.recoveryClass, '$.recoveryClass', 'InvalidRecoveryRequest');
  if (!recoveryClass.ok) return recoveryClass;
  const step = requireStepName(root.value.step, 'InvalidRecoveryRequest', '$.step');
  if (!step.ok) return step;
  const anomalyId = requireNonEmptyString(root.value.anomalyId, 'InvalidRecoveryRequest', '$.anomalyId');
  if (!anomalyId.ok) return anomalyId;
  const idempotencyKey = requireNonEmptyString(root.value.idempotencyKey, 'InvalidRecoveryRequest', '$.idempotencyKey');
  if (!idempotencyKey.ok) return idempotencyKey;

  if (!isRecoveryRequestSource(root.value.requestedBy)) {
    return invalid('InvalidRecoveryRequest', 'must be a recognized recovery request source', '$.requestedBy');
  }

  const ambiguous = requireBoolean(root.value.ambiguous, '$.ambiguous');
  if (!ambiguous.ok) return ambiguous;
  if (ambiguous.value) {
    return invalid('InvalidRecoveryRequest', 'ambiguous recovery requests must escalate', '$.ambiguous');
  }

  const userConfirmed = requireBoolean(root.value.userConfirmed, '$.userConfirmed');
  if (!userConfirmed.ok) return userConfirmed;

  let approvedDoctorRequestId: string | undefined;
  if (root.value.approvedDoctorRequestId !== undefined) {
    const approved = requireNonEmptyString(root.value.approvedDoctorRequestId, 'InvalidRecoveryRequest', '$.approvedDoctorRequestId');
    if (!approved.ok) return approved;
    approvedDoctorRequestId = approved.value;
  }

  if (root.value.requestedBy === 'doctor' && approvedDoctorRequestId === undefined) {
    return invalid('InvalidRecoveryRequest', 'doctor requests require an approved guarded request id', '$.approvedDoctorRequestId');
  }

  if (
    recoveryClass.value === 'restart-with-pinned-context' &&
    !userConfirmed.value &&
    (root.value.requestedBy !== 'doctor' || approvedDoctorRequestId === undefined)
  ) {
    return invalid('InvalidRecoveryRequest', 'restart requires explicit user confirmation or approved doctor request', '$.userConfirmed');
  }

  const ownership = parseOwnership(root.value.ownership);
  if (!ownership.ok) return ownership;
  const evidence = requireRecord(root.value.evidence, 'InvalidRecoveryRequest', '$.evidence');
  if (!evidence.ok) return evidence;

  return {
    ok: true,
    value: {
      recoveryClass: recoveryClass.value,
      step: step.value,
      anomalyId: anomalyId.value,
      idempotencyKey: idempotencyKey.value,
      requestedBy: root.value.requestedBy,
      ambiguous: false,
      userConfirmed: userConfirmed.value,
      approvedDoctorRequestId,
      ownership: ownership.value,
      evidence: evidence.value
    }
  };
};

export const createRecoveryActionResult = (
  value: unknown
): ManifestFactoryResult<RecoveryActionResult, 'InvalidRecoveryResult'> => {
  const root = requireRecord(value, 'InvalidRecoveryResult', '$');
  if (!root.ok) return root;

  const keys = rejectUnknownKeys(
    root.value,
    ['requestId', 'recoveryClass', 'anomalyId', 'result', 'interventionId', 'auditMessage', 'doctorEscalated'],
    'InvalidRecoveryResult',
    '$'
  );
  if (!keys.ok) return keys;

  const requestId = requireNonEmptyString(root.value.requestId, 'InvalidRecoveryResult', '$.requestId');
  if (!requestId.ok) return requestId;
  const recoveryClass = parseRecoveryClass(root.value.recoveryClass, '$.recoveryClass', 'InvalidRecoveryResult');
  if (!recoveryClass.ok) return recoveryClass;
  const anomalyId = requireNonEmptyString(root.value.anomalyId, 'InvalidRecoveryResult', '$.anomalyId');
  if (!anomalyId.ok) return anomalyId;
  if (!isInterventionResult(root.value.result)) {
    return invalid('InvalidRecoveryResult', 'must be a recovery intervention result', '$.result');
  }
  const interventionId = requireNonEmptyString(root.value.interventionId, 'InvalidRecoveryResult', '$.interventionId');
  if (!interventionId.ok) return interventionId;
  const auditMessage = requireNonEmptyString(root.value.auditMessage, 'InvalidRecoveryResult', '$.auditMessage');
  if (!auditMessage.ok) return auditMessage;
  if (typeof root.value.doctorEscalated !== 'boolean') {
    return invalid('InvalidRecoveryResult', 'must be a boolean', '$.doctorEscalated');
  }
  if (root.value.doctorEscalated && root.value.result !== 'escalated') {
    return invalid('InvalidRecoveryResult', 'doctor escalation is only valid for escalated results', '$.doctorEscalated');
  }

  return {
    ok: true,
    value: {
      requestId: requestId.value,
      recoveryClass: recoveryClass.value,
      anomalyId: anomalyId.value,
      result: root.value.result,
      interventionId: interventionId.value,
      auditMessage: auditMessage.value,
      doctorEscalated: root.value.doctorEscalated,
      requiresReconciliation: true
    }
  };
};
