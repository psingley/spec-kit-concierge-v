import type { InterventionTool } from '../manifest/types';

export type IntendedShapeAnomaly = {
  anomalyId: string;
  kind: string;
  ambiguous: boolean;
};

export type IntendedShapeAction = {
  action: InterventionTool;
  anomalyId: string;
};

export type ReconcileBranchToIntendedShapeRequest = {
  step: string;
  status: string;
  branchBefore: string;
  currentBranch: string;
  anomalies: readonly IntendedShapeAnomaly[];
  safeActions: readonly IntendedShapeAction[];
};

export type ReconcileBranchToIntendedShapeResult = {
  result: 'repaired' | 'no-op' | 'rejected' | 'escalated';
  actions: readonly IntendedShapeAction[];
  markComplete: false;
  message: string;
};

export const reconcileBranchToIntendedShape = (
  request: ReconcileBranchToIntendedShapeRequest
): ReconcileBranchToIntendedShapeResult => {
  if (request.currentBranch !== request.branchBefore) {
    return { result: 'rejected', actions: [], markComplete: false, message: 'Branch changed after nudge preconditions were captured' };
  }
  if (request.status !== 'needs-attention') {
    return { result: 'no-op', actions: [], markComplete: false, message: 'Session does not need nudge' };
  }
  if (request.anomalies.some((anomaly) => anomaly.ambiguous)) {
    return { result: 'escalated', actions: [], markComplete: false, message: 'Ambiguity escalates to the human' };
  }
  if (request.safeActions.length === 0) {
    return { result: 'escalated', actions: [], markComplete: false, message: 'No deterministic repair action is available' };
  }
  return {
    result: 'repaired',
    actions: request.safeActions,
    markComplete: false,
    message: `Planned ${request.safeActions.length} deterministic repair action`
  };
};
