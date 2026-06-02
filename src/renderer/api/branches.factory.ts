import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';
import type { BranchSession, RestoredStepCommits, RestoredStepFailures } from '../slices/workspace';
import type { StepName, StepState } from '../slices/steps';

type ErrorName = 'InvalidBranchSessions';
const stepNames: StepName[] = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'];
const states: StepState[] = ['not_available', 'pending', 'complete'];
const requiredSessionKeys = ['sessionId', 'worktreePath', 'branch', 'label', 'restoredStates', 'restoredStepCommits'] as const;
const optionalSessionKeys = ['restoredFailures'] as const;

export type RendererBranchSessions = { sessions: BranchSession[] };

export const parseRendererBranchSessions = (
  value: unknown
): RendererFactoryResult<RendererBranchSessions, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidBranchSessions', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['sessions']);
  if (!keys.ok) return keys;
  if (!Array.isArray(root.value.sessions)) {
    return { ok: false, error: { name: 'InvalidBranchSessions', message: 'sessions must be an array', path: '$.sessions' } };
  }
  const sessions: BranchSession[] = [];
  for (const session of root.value.sessions) {
    const record = requireRecord(session, 'InvalidBranchSessions', '$.sessions[]');
    if (!record.ok) return record;
    const allowedKeys = new Set([...requiredSessionKeys, ...optionalSessionKeys]);
    const missingKey = requiredSessionKeys.find((key) => !(key in record.value));
    const extraKey = Object.keys(record.value).find((key) => !allowedKeys.has(key as typeof requiredSessionKeys[number] | typeof optionalSessionKeys[number]));
    if (missingKey !== undefined) {
      return { ok: false, error: { name: 'InvalidBranchSessions', message: 'session is missing a required key', path: `$.sessions[].${missingKey}` } };
    }
    if (extraKey !== undefined) {
      return { ok: false, error: { name: 'InvalidRendererBoundaryPayload', message: 'unexpected session keys', path: `$.${extraKey}` } };
    }
    const sessionId = requireString(record.value.sessionId, 'InvalidBranchSessions', '$.sessions[].sessionId');
    const worktreePath = requireString(record.value.worktreePath, 'InvalidBranchSessions', '$.sessions[].worktreePath');
    const label = requireString(record.value.label, 'InvalidBranchSessions', '$.sessions[].label');
    const restored = requireRecord(record.value.restoredStates, 'InvalidBranchSessions', '$.sessions[].restoredStates');
    const restoredStepCommits = requireRecord(record.value.restoredStepCommits, 'InvalidBranchSessions', '$.sessions[].restoredStepCommits');
    const restoredFailuresRecord = record.value.restoredFailures === undefined
      ? { ok: true, value: {} as Record<string, unknown> } as const
      : requireRecord(record.value.restoredFailures, 'InvalidBranchSessions', '$.sessions[].restoredFailures');
    if (!sessionId.ok) return sessionId;
    if (!worktreePath.ok) return worktreePath;
    if (!label.ok) return label;
    if (!restored.ok) return restored;
    if (!restoredStepCommits.ok) return restoredStepCommits;
    if (!restoredFailuresRecord.ok) return restoredFailuresRecord;
    // branch is null for a detached, not-yet-named worktree; otherwise a non-empty string.
    const rawBranch = record.value.branch;
    let branch: string | null;
    if (rawBranch === null) {
      branch = null;
    } else {
      const parsedBranch = requireString(rawBranch, 'InvalidBranchSessions', '$.sessions[].branch');
      if (!parsedBranch.ok) return parsedBranch;
      branch = parsedBranch.value;
    }
    const restoredStates = {} as Record<StepName, StepState>;
    for (const step of stepNames) {
      if (!states.includes(restored.value[step] as StepState)) {
        return { ok: false, error: { name: 'InvalidBranchSessions', message: 'invalid step state', path: `$.sessions[].restoredStates.${step}` } };
      }
      restoredStates[step] = restored.value[step] as StepState;
    }
    const commits: RestoredStepCommits = {};
    for (const [step, commitSha] of Object.entries(restoredStepCommits.value)) {
      if (!stepNames.includes(step as StepName)) {
        return { ok: false, error: { name: 'InvalidBranchSessions', message: 'invalid restored step commit key', path: `$.sessions[].restoredStepCommits.${step}` } };
      }
      if (typeof commitSha !== 'string' || commitSha.trim().length === 0) {
        return { ok: false, error: { name: 'InvalidBranchSessions', message: 'invalid restored step commit', path: `$.sessions[].restoredStepCommits.${step}` } };
      }
      commits[step as StepName] = commitSha;
    }
    const failures: RestoredStepFailures = {};
    for (const [step, failure] of Object.entries(restoredFailuresRecord.value)) {
      if (!stepNames.includes(step as StepName)) {
        return { ok: false, error: { name: 'InvalidBranchSessions', message: 'invalid restored failure key', path: `$.sessions[].restoredFailures.${step}` } };
      }
      const failureRecord = requireRecord(failure, 'InvalidBranchSessions', `$.sessions[].restoredFailures.${step}`);
      if (!failureRecord.ok) return failureRecord;
      const failureStep = requireString(failureRecord.value.step, 'InvalidBranchSessions', `$.sessions[].restoredFailures.${step}.step`);
      const failureSessionId = requireString(failureRecord.value.sessionId, 'InvalidBranchSessions', `$.sessions[].restoredFailures.${step}.sessionId`);
      const failedAt = requireString(failureRecord.value.failedAt, 'InvalidBranchSessions', `$.sessions[].restoredFailures.${step}.failedAt`);
      const reason = requireString(failureRecord.value.reason, 'InvalidBranchSessions', `$.sessions[].restoredFailures.${step}.reason`);
      if (!failureStep.ok) return failureStep;
      if (!failureSessionId.ok) return failureSessionId;
      if (!failedAt.ok) return failedAt;
      if (!reason.ok) return reason;
      if (failureStep.value !== step) {
        return { ok: false, error: { name: 'InvalidBranchSessions', message: 'restored failure step mismatch', path: `$.sessions[].restoredFailures.${step}.step` } };
      }
      if (!Array.isArray(failureRecord.value.strandedArtifacts) || !failureRecord.value.strandedArtifacts.every((artifact) => typeof artifact === 'string' && !artifact.includes('..'))) {
        return { ok: false, error: { name: 'InvalidBranchSessions', message: 'invalid restored failure artifacts', path: `$.sessions[].restoredFailures.${step}.strandedArtifacts` } };
      }
      if (
        failureRecord.value.anomalyIds !== undefined &&
        (!Array.isArray(failureRecord.value.anomalyIds) || !failureRecord.value.anomalyIds.every((anomalyId) => typeof anomalyId === 'string' && anomalyId.trim().length > 0))
      ) {
        return { ok: false, error: { name: 'InvalidBranchSessions', message: 'invalid restored failure anomaly ids', path: `$.sessions[].restoredFailures.${step}.anomalyIds` } };
      }
      failures[step as StepName] = {
        step: step as StepName,
        sessionId: failureSessionId.value,
        failedAt: failedAt.value,
        reason: reason.value,
        strandedArtifacts: failureRecord.value.strandedArtifacts,
        anomalyIds: failureRecord.value.anomalyIds ?? []
      };
    }
    sessions.push({ sessionId: sessionId.value, worktreePath: worktreePath.value, branch, label: label.value, restoredStates, restoredStepCommits: commits, restoredFailures: failures });
  }
  return { ok: true, value: { sessions } };
};
