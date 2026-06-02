import { mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { writeFailedStepMarker } from '../failedSteps';
import { restoreManifestPaths } from '../git/gitCommand';
import type {
  Anomaly,
  AuditRecord,
  Intervention,
  InterventionResult,
  InterventionTool,
  SessionManifestV1
} from '../../domain/manifest/types';
import {
  createRecoveryActionResult,
  type RecoveryActionResult,
  type SafeRecoveryClass,
  type SafeRecoveryRequest
} from '../../domain/recovery/recoveryCatalog.factory';
import type { HybridManifestLogger } from '../../logging/hybridManifest.logging';

export type RecoveryDiskTruth = {
  manifest: SessionManifestV1;
  branch: string;
  featureDir: string;
  stepOwnedPaths: string[];
  ambiguousDestinations?: boolean;
  matchingCompletion?: {
    commitSha: string;
    snapshotHash: string;
  };
  restorePointAvailable?: boolean;
  observedProcess?: {
    attemptId: string;
    state: 'pending' | 'running' | 'killed' | 'interrupted';
  };
};

export type RecoveryActionContext = {
  repositoryPath: string;
  userDataPath: string;
  request: SafeRecoveryRequest;
  diskTruth: RecoveryDiskTruth;
  anomaly: Anomaly;
  anomalyIds: string[];
  strandedArtifacts: string[];
};

export type RecoveryActions = {
  relocateArtifact: (context: RecoveryActionContext) => Promise<void>;
  adoptValidCompletion: (context: RecoveryActionContext) => Promise<void>;
  refreshFailedMarker: (context: RecoveryActionContext) => Promise<void>;
  revertUnrelatedFiles: (context: RecoveryActionContext) => Promise<void>;
  cancelActiveStep: (context: RecoveryActionContext) => Promise<void>;
  reRunStepWithPinnedContext: (context: RecoveryActionContext) => Promise<void>;
};

export type RecoveryActionName = Extract<keyof RecoveryActions, InterventionTool>;

export type ExecuteDeterministicRecoveryRequest = {
  repositoryPath: string;
  userDataPath: string;
  request: SafeRecoveryRequest;
  readDiskTruth: (request: SafeRecoveryRequest) => Promise<RecoveryDiskTruth>;
  actions?: Partial<RecoveryActions>;
  appendIntervention?: (intervention: Intervention) => Promise<void>;
  appendAudit?: (audit: AuditRecord) => Promise<void>;
  logger?: HybridManifestLogger;
  now?: () => string;
};

const toolByClass: Record<SafeRecoveryClass, RecoveryActionName> = {
  'relocate-step-owned-artifact': 'relocateArtifact',
  'adopt-valid-completion': 'adoptValidCompletion',
  'refresh-failed-marker': 'refreshFailedMarker',
  'revert-proven-unrelated-file': 'revertUnrelatedFiles',
  'cancel-observed-active-step': 'cancelActiveStep',
  'restart-with-pinned-context': 'reRunStepWithPinnedContext'
};

const defaultActions: RecoveryActions = {
  relocateArtifact: async ({ request }) => {
    const sourcePath = stringEvidence(request.evidence, 'sourcePath');
    const destinationPath = stringEvidence(request.evidence, 'destinationPath');
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await rename(sourcePath, destinationPath);
  },
  adoptValidCompletion: async () => undefined,
  refreshFailedMarker: async ({ repositoryPath, userDataPath, request, anomalyIds, strandedArtifacts }) => {
    await writeFailedStepMarker({
      repositoryPath,
      userDataPath,
      step: request.step,
      sessionId: request.idempotencyKey,
      failedAt: new Date().toISOString(),
      reason: `needs-attention: ${request.recoveryClass}`,
      anomalyIds,
      strandedArtifacts
    });
  },
  revertUnrelatedFiles: async ({ repositoryPath, request }) => {
    await restoreManifestPaths(repositoryPath, stringArrayEvidence(request.evidence, 'paths'));
  },
  cancelActiveStep: async () => undefined,
  reRunStepWithPinnedContext: async () => undefined
};

const stringEvidence = (evidence: Record<string, unknown>, key: string): string => {
  const value = evidence[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`missing recovery evidence: ${key}`);
  }
  return value;
};

const stringArrayEvidence = (evidence: Record<string, unknown>, key: string): string[] => {
  const value = evidence[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return [];
  }
  return value;
};

const strandedArtifactsFrom = (anomaly: Anomaly, request: SafeRecoveryRequest): string[] => {
  const evidencePaths = stringArrayEvidence(anomaly.evidence, 'paths');
  if (evidencePaths.length > 0) return evidencePaths;
  return request.ownership.paths;
};

const hasExistingIntervention = (
  manifest: SessionManifestV1,
  request: SafeRecoveryRequest
): Intervention | undefined =>
  manifest.interventions.find((intervention) =>
    intervention.anomalyId === request.anomalyId &&
    intervention.tool === toolByClass[request.recoveryClass]
  );

const createResult = (
  request: SafeRecoveryRequest,
  result: InterventionResult,
  interventionId: string,
  auditMessage: string,
  doctorEscalated = false
): RecoveryActionResult => {
  const parsed = createRecoveryActionResult({
    requestId: request.idempotencyKey,
    recoveryClass: request.recoveryClass,
    anomalyId: request.anomalyId,
    result,
    interventionId,
    auditMessage,
    doctorEscalated
  });

  if (!parsed.ok) {
    throw new Error(parsed.error.message);
  }

  return parsed.value;
};

const pathsAreUnrelated = (paths: string[], stepOwnedPaths: string[]): boolean =>
  paths.length > 0 && paths.every((candidate) => !stepOwnedPaths.includes(candidate));

const validateClassPreconditions = (
  request: SafeRecoveryRequest,
  diskTruth: RecoveryDiskTruth
): { ok: true } | { ok: false; result: InterventionResult; message: string; doctorEscalated?: boolean } => {
  if (diskTruth.branch !== request.ownership.branch || diskTruth.featureDir !== request.ownership.featureDir) {
    return { ok: false, result: 'escalated', message: 'branch or feature directory changed after recovery preconditions were captured' };
  }

  switch (request.recoveryClass) {
    case 'relocate-step-owned-artifact': {
      if (diskTruth.ambiguousDestinations === true) {
        return { ok: false, result: 'escalated', message: 'ambiguous artifact destination requires human recovery' };
      }
      const destinationPath = stringEvidence(request.evidence, 'destinationPath');
      return request.ownership.paths.includes(destinationPath)
        ? { ok: true }
        : { ok: false, result: 'rejected', message: 'relocate destination is outside step ownership' };
    }
    case 'adopt-valid-completion':
      return diskTruth.matchingCompletion?.snapshotHash === request.ownership.snapshotHash
        ? { ok: true }
        : { ok: false, result: 'rejected', message: 'completion evidence does not match the intended artifact snapshot' };
    case 'refresh-failed-marker':
      return { ok: true };
    case 'revert-proven-unrelated-file': {
      const paths = stringArrayEvidence(request.evidence, 'paths');
      if (diskTruth.restorePointAvailable !== true) {
        return { ok: false, result: 'escalated', message: 'unrelated file revert has no safe restore point' };
      }
      return pathsAreUnrelated(paths, diskTruth.stepOwnedPaths)
        ? { ok: true }
        : { ok: false, result: 'rejected', message: 'revert request includes step-owned or ambiguous paths' };
    }
    case 'cancel-observed-active-step':
      return diskTruth.observedProcess?.state === 'running' || diskTruth.observedProcess?.state === 'pending'
        ? { ok: true }
        : { ok: false, result: 'rejected', message: 'no active observed process can be canceled' };
    case 'restart-with-pinned-context':
      return request.userConfirmed || (request.requestedBy === 'doctor' && request.approvedDoctorRequestId !== undefined)
        ? { ok: true }
        : { ok: false, result: 'rejected', message: 'restart requires pinned user or doctor authorization' };
  }
};

export const executeDeterministicRecovery = async (
  options: ExecuteDeterministicRecoveryRequest
): Promise<RecoveryActionResult> => {
  const now = options.now?.() ?? new Date().toISOString();
  const diskTruth = await options.readDiskTruth(options.request);
  const interventionId = `intervention-${options.request.idempotencyKey}`;
  const auditMessage = `deterministic recovery ${options.request.recoveryClass} for ${options.request.anomalyId}`;
  const existingIntervention = hasExistingIntervention(diskTruth.manifest, options.request);

  if (existingIntervention !== undefined) {
    return createResult(options.request, 'no-op', existingIntervention.interventionId, existingIntervention.auditMessage);
  }

  const anomaly = diskTruth.manifest.anomalies.find((candidate) => candidate.anomalyId === options.request.anomalyId);
  if (anomaly === undefined || anomaly.severity !== 'blocking') {
    return createResult(options.request, 'rejected', interventionId, 'recovery anomaly is missing or non-blocking');
  }

  const preconditions = validateClassPreconditions(options.request, diskTruth);
  if (!preconditions.ok) {
    return createResult(
      options.request,
      preconditions.result,
      interventionId,
      preconditions.message,
      preconditions.doctorEscalated ?? false
    );
  }

  const actions = { ...defaultActions, ...options.actions };
  const tool = toolByClass[options.request.recoveryClass];
  const context: RecoveryActionContext = {
    repositoryPath: options.repositoryPath,
    userDataPath: options.userDataPath,
    request: options.request,
    diskTruth,
    anomaly,
    anomalyIds: [options.request.anomalyId],
    strandedArtifacts: strandedArtifactsFrom(anomaly, options.request)
  };

  await actions[tool](context);

  const intervention: Intervention = {
    interventionId,
    anomalyId: options.request.anomalyId,
    tool,
    startedAt: now,
    endedAt: now,
    preconditionSnapshot: {
      branch: diskTruth.branch,
      featureDir: diskTruth.featureDir,
      snapshotHash: options.request.ownership.snapshotHash,
      idempotencyKey: options.request.idempotencyKey
    },
    result: 'applied',
    auditMessage
  };
  await options.appendIntervention?.(intervention);

  await options.appendAudit?.({
    auditId: `audit-${options.request.idempotencyKey}`,
    at: now,
    event: 'recovery-action',
    step: options.request.step,
    message: auditMessage
  });

  options.logger?.info(
    {
      event: 'recovery-action',
      feature: 'hybrid-manifest',
      recoveryClass: options.request.recoveryClass,
      anomalyId: options.request.anomalyId,
      interventionId,
      result: 'applied'
    },
    'hybrid manifest event'
  );

  return createResult(options.request, 'applied', interventionId, auditMessage);
};
