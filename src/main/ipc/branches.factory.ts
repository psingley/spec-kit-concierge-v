import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';
import type { BranchSessionSummary, StepName, StepState } from '../data-layer/git/branchSessions';

type ErrorName = 'InvalidBranchesPayload';
const stepNames: StepName[] = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'];
const states: StepState[] = ['not_available', 'pending', 'complete'];

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
    const recordKeys = requireExactKeys(record.value, ['branch', 'label', 'restoredStates'], 'InvalidBranchesPayload', '$.sessions[]');
    if (!recordKeys.ok) return recordKeys;
    const branch = requireString(record.value.branch, 'InvalidBranchesPayload', '$.sessions[].branch');
    const label = requireString(record.value.label, 'InvalidBranchesPayload', '$.sessions[].label');
    const restoredStates = requireRecord(record.value.restoredStates, 'InvalidBranchesPayload', '$.sessions[].restoredStates');
    if (!branch.ok) return branch;
    if (!label.ok) return label;
    if (!restoredStates.ok) return restoredStates;
    if (!branch.value.startsWith('spec/') || branch.value.includes('..')) {
      return invalid('InvalidBranchesPayload', 'branch must be a safe spec/* ref', '$.sessions[].branch');
    }
    const restored = {} as Record<StepName, StepState>;
    for (const step of stepNames) {
      const state = restoredStates.value[step];
      if (!states.includes(state as StepState)) {
        return invalid('InvalidBranchesPayload', 'restored state must be canonical', `$.sessions[].restoredStates.${step}`);
      }
      restored[step] = state as StepState;
    }
    sessions.push({ branch: branch.value, label: label.value, restoredStates: restored });
  }
  return { ok: true, value: { sessions } };
};
