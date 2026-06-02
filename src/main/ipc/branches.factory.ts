import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';
import type { BranchSessionSummary, RestoredStepCommits, StepName, StepState } from '../data-layer/git/branchSessions';
import type { RestoredStepFailures } from '../data-layer/failedSteps';

type ErrorName = 'InvalidBranchesPayload';
const stepNames: StepName[] = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'];
const states: StepState[] = ['not_available', 'pending', 'complete'];
const sessionKeys = ['sessionId', 'worktreePath', 'branch', 'label', 'restoredStates', 'restoredStepCommits'] as const;
const optionalSessionKeys = ['restoredFailures'] as const;

export type BranchSessionsRequest = { repositoryPath: string };
export type BranchSessionsResponse = { sessions: BranchSessionSummary[] };

export const createBranchSessionsRequest = (value: unknown): FactoryResult<BranchSessionsRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidBranchesPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['repositoryPath'], 'InvalidBranchesPayload', '$');
  if (!keys.ok) return keys;
  const repositoryPath = requireString(root.value.repositoryPath, 'InvalidBranchesPayload', '$.repositoryPath');
  if (!repositoryPath.ok) return repositoryPath;
  if (repositoryPath.value.includes('..')) {
    return invalid('InvalidBranchesPayload', 'repositoryPath must not contain traversal', '$.repositoryPath');
  }
  return { ok: true, value: { repositoryPath: repositoryPath.value } };
};

export const createBranchSessionsResponse = (value: unknown): FactoryResult<BranchSessionsResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidBranchesPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['sessions'], 'InvalidBranchesPayload', '$');
  if (!keys.ok) return keys;
  if (!Array.isArray(root.value.sessions)) {
    return invalid('InvalidBranchesPayload', 'sessions must be an array', '$.sessions');
  }
  const sessions: BranchSessionSummary[] = [];
  for (const session of root.value.sessions) {
    const record = requireRecord(session, 'InvalidBranchesPayload', '$.sessions[]');
    if (!record.ok) return record;
    const allowedKeys = new Set([...sessionKeys, ...optionalSessionKeys]);
    const missingKey = sessionKeys.find((key) => !(key in record.value));
    const extraKey = Object.keys(record.value).find((key) => !allowedKeys.has(key as typeof sessionKeys[number] | typeof optionalSessionKeys[number]));
    if (missingKey !== undefined || extraKey !== undefined) {
      return invalid('InvalidBranchesPayload', 'session payload keys are invalid', `$.sessions[].${missingKey ?? extraKey ?? ''}`);
    }
    const sessionId = requireString(record.value.sessionId, 'InvalidBranchesPayload', '$.sessions[].sessionId');
    const worktreePath = requireString(record.value.worktreePath, 'InvalidBranchesPayload', '$.sessions[].worktreePath');
    const label = requireString(record.value.label, 'InvalidBranchesPayload', '$.sessions[].label');
    const restoredStates = requireRecord(record.value.restoredStates, 'InvalidBranchesPayload', '$.sessions[].restoredStates');
    const restoredStepCommits = requireRecord(record.value.restoredStepCommits, 'InvalidBranchesPayload', '$.sessions[].restoredStepCommits');
    const restoredFailuresRecord = record.value.restoredFailures === undefined
      ? { ok: true, value: {} as Record<string, unknown> } as const
      : requireRecord(record.value.restoredFailures, 'InvalidBranchesPayload', '$.sessions[].restoredFailures');
    if (!sessionId.ok) return sessionId;
    if (!worktreePath.ok) return worktreePath;
    if (!label.ok) return label;
    if (!restoredStates.ok) return restoredStates;
    if (!restoredStepCommits.ok) return restoredStepCommits;
    if (!restoredFailuresRecord.ok) return restoredFailuresRecord;
    if (sessionId.value.includes('..') || worktreePath.value.includes('..')) {
      return invalid('InvalidBranchesPayload', 'sessionId/worktreePath must not contain traversal', '$.sessions[]');
    }
    // branch is null for a detached, not-yet-named worktree (start-new before
    // spec-kit names the branch). A named branch must be a legacy spec/* ref or
    // spec-kit's NNNN-slug feature branch (e.g. 014-remove-faux-controls), with no
    // path traversal.
    const rawBranch = record.value.branch;
    let branch: string | null;
    if (rawBranch === null) {
      branch = null;
    } else if (typeof rawBranch === 'string') {
      const isLegacySpecRef = rawBranch.startsWith('spec/');
      const isSpecKitFeatureBranch = /^\d{3,4}-/.test(rawBranch);
      if ((!isLegacySpecRef && !isSpecKitFeatureBranch) || rawBranch.includes('..')) {
        return invalid('InvalidBranchesPayload', 'branch must be a safe spec/* or NNNN-slug ref', '$.sessions[].branch');
      }
      branch = rawBranch;
    } else {
      return invalid('InvalidBranchesPayload', 'branch must be a string or null', '$.sessions[].branch');
    }
    const restored = {} as Record<StepName, StepState>;
    for (const step of stepNames) {
      const state = restoredStates.value[step];
      if (!states.includes(state as StepState)) {
        return invalid('InvalidBranchesPayload', 'restored state must be canonical', `$.sessions[].restoredStates.${step}`);
      }
      restored[step] = state as StepState;
    }
    const commits: RestoredStepCommits = {};
    for (const [step, commitSha] of Object.entries(restoredStepCommits.value)) {
      if (!stepNames.includes(step as StepName)) {
        return invalid('InvalidBranchesPayload', 'restored step commit key must be a known step', `$.sessions[].restoredStepCommits.${step}`);
      }
      if (typeof commitSha !== 'string' || commitSha.trim().length === 0 || commitSha.includes('..')) {
        return invalid('InvalidBranchesPayload', 'restored step commit must be a safe non-empty string', `$.sessions[].restoredStepCommits.${step}`);
      }
      commits[step as StepName] = commitSha;
    }
    const failures: RestoredStepFailures = {};
    for (const [step, failure] of Object.entries(restoredFailuresRecord.value)) {
      if (!stepNames.includes(step as StepName)) {
        return invalid('InvalidBranchesPayload', 'restored failure key must be a known step', `$.sessions[].restoredFailures.${step}`);
      }
      const failureRecord = requireRecord(failure, 'InvalidBranchesPayload', `$.sessions[].restoredFailures.${step}`);
      if (!failureRecord.ok) return failureRecord;
      const failureStep = requireString(failureRecord.value.step, 'InvalidBranchesPayload', `$.sessions[].restoredFailures.${step}.step`);
      const failureSessionId = requireString(failureRecord.value.sessionId, 'InvalidBranchesPayload', `$.sessions[].restoredFailures.${step}.sessionId`);
      const failedAt = requireString(failureRecord.value.failedAt, 'InvalidBranchesPayload', `$.sessions[].restoredFailures.${step}.failedAt`);
      const reason = requireString(failureRecord.value.reason, 'InvalidBranchesPayload', `$.sessions[].restoredFailures.${step}.reason`);
      if (!failureStep.ok) return failureStep;
      if (!failureSessionId.ok) return failureSessionId;
      if (!failedAt.ok) return failedAt;
      if (!reason.ok) return reason;
      if (failureStep.value !== step) {
        return invalid('InvalidBranchesPayload', 'restored failure step mismatch', `$.sessions[].restoredFailures.${step}.step`);
      }
      if (!Array.isArray(failureRecord.value.strandedArtifacts) || !failureRecord.value.strandedArtifacts.every((artifact) => typeof artifact === 'string' && !artifact.includes('..'))) {
        return invalid('InvalidBranchesPayload', 'restored failure artifacts must be safe strings', `$.sessions[].restoredFailures.${step}.strandedArtifacts`);
      }
      failures[step as StepName] = {
        step: step as StepName,
        sessionId: failureSessionId.value,
        failedAt: failedAt.value,
        reason: reason.value,
        strandedArtifacts: failureRecord.value.strandedArtifacts
      };
    }
    sessions.push({ sessionId: sessionId.value, worktreePath: worktreePath.value, branch, label: label.value, restoredStates: restored, restoredStepCommits: commits, restoredFailures: failures });
  }
  return { ok: true, value: { sessions } };
};
