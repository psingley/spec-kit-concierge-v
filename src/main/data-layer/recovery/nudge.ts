import {
  reconcileBranchToIntendedShape,
  type IntendedShapeAction,
  type IntendedShapeAnomaly
} from '../../domain/reconciliation/reconcileBranchToIntendedShape';
import type {
  AuditRecord,
  Intervention,
  NudgeRequest,
  ReconciliationStatus,
  SessionManifestV1,
  StepName
} from '../../domain/manifest/types';
import type { HybridManifestLogger } from '../../logging/hybridManifest.logging';

export type NudgeDiskTruth = {
  manifest: SessionManifestV1;
  step: StepName;
  status: ReconciliationStatus;
  branchBefore: string;
  currentBranch: string;
  anomalies: readonly IntendedShapeAnomaly[];
  safeActions: readonly IntendedShapeAction[];
};

export type NudgeRecoveryResult = {
  result: 'repaired' | 'no-op' | 'rejected' | 'escalated';
  markComplete: false;
  interventionIds: string[];
  anomalyIds: string[];
  message: string;
};

export type ExecuteNudgeRecoveryRequest = {
  repositoryPath: string;
  readDiskTruth: () => Promise<NudgeDiskTruth>;
  applyAction: (action: IntendedShapeAction, truth: NudgeDiskTruth) => Promise<void>;
  appendIntervention?: (intervention: Intervention) => Promise<void>;
  appendAudit?: (audit: AuditRecord) => Promise<void>;
  appendNudge?: (nudge: NudgeRequest) => Promise<void>;
  reconcileAfterAction?: (event: { step: StepName; action: string; anomalyId: string }) => Promise<unknown>;
  logger?: HybridManifestLogger;
  now?: () => string;
  id?: () => string;
};

const createNudgeRecord = (
  nudgeId: string,
  at: string,
  step: StepName,
  result: NudgeRecoveryResult
): NudgeRequest => ({
  nudgeId,
  requestedAt: at,
  step,
  result: result.result,
  anomalyIds: result.anomalyIds,
  interventionIds: result.interventionIds,
  message: result.message
});

const persistResult = async (
  options: ExecuteNudgeRecoveryRequest,
  nudgeId: string,
  at: string,
  step: StepName,
  result: NudgeRecoveryResult
): Promise<NudgeRecoveryResult> => {
  await options.appendNudge?.(createNudgeRecord(nudgeId, at, step, result));
  options.logger?.info(
    {
      event: 'nudge-action',
      feature: 'hybrid-manifest',
      repositoryPath: options.repositoryPath,
      step,
      result: result.result,
      interventionIds: result.interventionIds,
      anomalyIds: result.anomalyIds
    },
    'hybrid manifest event'
  );
  return result;
};

export const executeNudgeRecovery = async (
  options: ExecuteNudgeRecoveryRequest
): Promise<NudgeRecoveryResult> => {
  const at = options.now?.() ?? new Date().toISOString();
  const nudgeId = options.id?.() ?? `nudge-${Date.now()}`;
  const initialTruth = await options.readDiskTruth();
  const plan = reconcileBranchToIntendedShape({
    step: initialTruth.step,
    status: initialTruth.status,
    branchBefore: initialTruth.branchBefore,
    currentBranch: initialTruth.currentBranch,
    anomalies: initialTruth.anomalies,
    safeActions: initialTruth.safeActions
  });

  if (plan.result !== 'repaired') {
    return persistResult(options, nudgeId, at, initialTruth.step, {
      result: plan.result,
      markComplete: false,
      interventionIds: [],
      anomalyIds: initialTruth.anomalies.map((anomaly) => anomaly.anomalyId),
      message: plan.message
    });
  }

  const interventionIds: string[] = [];
  for (const [index, action] of plan.actions.entries()) {
    const latestTruth = await options.readDiskTruth();
    if (latestTruth.currentBranch !== initialTruth.branchBefore) {
      return persistResult(options, nudgeId, at, initialTruth.step, {
        result: 'rejected',
        markComplete: false,
        interventionIds,
        anomalyIds: initialTruth.anomalies.map((anomaly) => anomaly.anomalyId),
        message: 'Branch changed after nudge preconditions were captured'
      });
    }

    await options.applyAction(action, latestTruth);
    const interventionId = `intervention-${nudgeId}-${index}`;
    interventionIds.push(interventionId);

    const intervention: Intervention = {
      interventionId,
      anomalyId: action.anomalyId,
      tool: action.action,
      startedAt: at,
      endedAt: at,
      preconditionSnapshot: {
        branch: latestTruth.currentBranch,
        step: latestTruth.step,
        nudgeId
      },
      result: 'applied',
      auditMessage: `nudge applied ${action.action} for ${action.anomalyId}`
    };
    await options.appendIntervention?.(intervention);
    await options.appendAudit?.({
      auditId: `audit-${nudgeId}-${index}`,
      at,
      event: 'nudge-action',
      step: latestTruth.step,
      message: intervention.auditMessage
    });
    await options.reconcileAfterAction?.({ step: latestTruth.step, action: action.action, anomalyId: action.anomalyId });
  }

  return persistResult(options, nudgeId, at, initialTruth.step, {
    result: 'repaired',
    markComplete: false,
    interventionIds,
    anomalyIds: initialTruth.anomalies.map((anomaly) => anomaly.anomalyId),
    message: plan.message
  });
};
