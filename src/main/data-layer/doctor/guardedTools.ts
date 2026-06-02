import type {
  AuditRecord,
  DoctorToolInvocation,
  GuardedDoctorTool,
  StepName
} from '../../domain/manifest/types';
import { createSafeRecoveryRequest, type SafeRecoveryClass, type SafeRecoveryRequest } from '../../domain/recovery/recoveryCatalog.factory';
import type { HybridManifestLogger } from '../../logging/hybridManifest.logging';

export type GuardedDoctorToolRequest = {
  invocationId: string;
  step: StepName;
  attemptNumber: 1 | 2;
  tool: GuardedDoctorTool;
  arguments: Record<string, unknown>;
};

export type GuardedDoctorToolResult = {
  result: 'applied' | 'rejected' | 'escalated' | 'no-op';
  requiresReconciliation: true;
  interventionId?: string;
  rejectionReason?: string;
};

export type ExecuteGuardedDoctorToolRequest = {
  repositoryPath: string;
  userDataPath: string;
  request: GuardedDoctorToolRequest;
  executeRecovery: (request: {
    repositoryPath: string;
    userDataPath: string;
    request: SafeRecoveryRequest;
  }) => Promise<GuardedDoctorToolResult>;
  issueCorrectionPrompt: (request: ExecuteGuardedDoctorToolRequest) => Promise<GuardedDoctorToolResult>;
  appendDoctorInvocation?: (invocation: DoctorToolInvocation) => Promise<void>;
  appendAudit?: (audit: AuditRecord) => Promise<void>;
  logger?: HybridManifestLogger;
  now?: () => string;
};

const recoveryClassByTool: Partial<Record<GuardedDoctorTool, SafeRecoveryClass>> = {
  relocateArtifact: 'relocate-step-owned-artifact',
  reRunStepWithPinnedContext: 'restart-with-pinned-context',
  revertUnrelatedFiles: 'revert-proven-unrelated-file',
  markFailedWithStrandedArtifacts: 'refresh-failed-marker',
  cancelActiveStep: 'cancel-observed-active-step'
};

const stringArg = (args: Record<string, unknown>, key: string): string =>
  typeof args[key] === 'string' && args[key].length > 0 ? args[key] : '';

const stringArrayArg = (args: Record<string, unknown>, key: string): string[] =>
  Array.isArray(args[key]) ? args[key].filter((item): item is string => typeof item === 'string') : [];

const recordInvocation = async (
  options: ExecuteGuardedDoctorToolRequest,
  result: DoctorToolInvocation['result'],
  rejectionReason?: string
): Promise<void> => {
  const now = options.now?.() ?? new Date().toISOString();
  await options.appendDoctorInvocation?.({
    invocationId: options.request.invocationId,
    step: options.request.step,
    attemptNumber: options.request.attemptNumber,
    tool: options.request.tool,
    argumentsHash: `sha256:${JSON.stringify(options.request.arguments).length}`,
    startedAt: now,
    endedAt: now,
    result,
    ...(rejectionReason === undefined ? {} : { rejectionReason })
  });
  await options.appendAudit?.({
    auditId: `audit-${options.request.invocationId}`,
    at: now,
    event: 'doctor-invocation',
    step: options.request.step,
    message: `${options.request.tool} ${result}`
  });
  options.logger?.info({
    event: 'doctor-invocation',
    feature: 'hybrid-manifest',
    tool: options.request.tool,
    invocationId: options.request.invocationId,
    result
  }, 'hybrid manifest event');
};

const recoveryRequestFor = (options: ExecuteGuardedDoctorToolRequest) => {
  const args = options.request.arguments;
  const recoveryClass = recoveryClassByTool[options.request.tool];
  if (recoveryClass === undefined) return undefined;

  return createSafeRecoveryRequest({
    recoveryClass,
    step: options.request.step,
    anomalyId: stringArg(args, 'anomalyId'),
    idempotencyKey: stringArg(args, 'idempotencyKey'),
    requestedBy: 'doctor',
    ambiguous: args.ambiguous === true,
    userConfirmed: false,
    approvedDoctorRequestId: options.request.invocationId,
    ownership: {
      featureDir: stringArg(args, 'featureDir'),
      branch: stringArg(args, 'branch'),
      paths: stringArrayArg(args, 'paths'),
      snapshotHash: stringArg(args, 'snapshotHash')
    },
    evidence: typeof args.evidence === 'object' && args.evidence !== null && !Array.isArray(args.evidence)
      ? args.evidence
      : {}
  });
};

export const executeGuardedDoctorTool = async (
  options: ExecuteGuardedDoctorToolRequest
): Promise<GuardedDoctorToolResult> => {
  if (options.request.tool === 'issueCorrectionPrompt') {
    const result = await options.issueCorrectionPrompt(options);
    await recordInvocation(options, 'returned');
    return { ...result, requiresReconciliation: true };
  }

  const recoveryRequest = recoveryRequestFor(options);
  if (recoveryRequest === undefined || !recoveryRequest.ok) {
    const rejectionReason = recoveryRequest === undefined
      ? 'guarded doctor tool has no deterministic action'
      : recoveryRequest.error.message;
    await recordInvocation(options, 'rejected', rejectionReason);
    return { result: 'rejected', requiresReconciliation: true, rejectionReason };
  }

  const result = await options.executeRecovery({
    repositoryPath: options.repositoryPath,
    userDataPath: options.userDataPath,
    request: recoveryRequest.value
  });
  await recordInvocation(options, result.result === 'rejected' ? 'rejected' : 'returned', result.rejectionReason);
  return { ...result, requiresReconciliation: true };
};
