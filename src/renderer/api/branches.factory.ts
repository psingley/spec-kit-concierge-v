import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';
import type { BranchSession, RestoredStepCommits } from '../slices/workspace';
import type { StepName, StepState } from '../slices/steps';

type ErrorName = 'InvalidBranchSessions';
const stepNames: StepName[] = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'];
const states: StepState[] = ['not_available', 'pending', 'complete'];

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
    const recordKeys = requireExactKeys<ErrorName>(record.value, ['sessionId', 'worktreePath', 'branch', 'label', 'restoredStates', 'restoredStepCommits']);
    if (!recordKeys.ok) return recordKeys;
    const sessionId = requireString(record.value.sessionId, 'InvalidBranchSessions', '$.sessions[].sessionId');
    const worktreePath = requireString(record.value.worktreePath, 'InvalidBranchSessions', '$.sessions[].worktreePath');
    const label = requireString(record.value.label, 'InvalidBranchSessions', '$.sessions[].label');
    const restored = requireRecord(record.value.restoredStates, 'InvalidBranchSessions', '$.sessions[].restoredStates');
    const restoredStepCommits = requireRecord(record.value.restoredStepCommits, 'InvalidBranchSessions', '$.sessions[].restoredStepCommits');
    if (!sessionId.ok) return sessionId;
    if (!worktreePath.ok) return worktreePath;
    if (!label.ok) return label;
    if (!restored.ok) return restored;
    if (!restoredStepCommits.ok) return restoredStepCommits;
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
    sessions.push({ sessionId: sessionId.value, worktreePath: worktreePath.value, branch, label: label.value, restoredStates, restoredStepCommits: commits });
  }
  return { ok: true, value: { sessions } };
};
