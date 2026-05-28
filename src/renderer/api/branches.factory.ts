import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';
import type { BranchSession } from '../slices/workspace';
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
    const recordKeys = requireExactKeys<ErrorName>(record.value, ['branch', 'label', 'restoredStates']);
    if (!recordKeys.ok) return recordKeys;
    const branch = requireString(record.value.branch, 'InvalidBranchSessions', '$.sessions[].branch');
    const label = requireString(record.value.label, 'InvalidBranchSessions', '$.sessions[].label');
    const restored = requireRecord(record.value.restoredStates, 'InvalidBranchSessions', '$.sessions[].restoredStates');
    if (!branch.ok) return branch;
    if (!label.ok) return label;
    if (!restored.ok) return restored;
    const restoredStates = {} as Record<StepName, StepState>;
    for (const step of stepNames) {
      if (!states.includes(restored.value[step] as StepState)) {
        return { ok: false, error: { name: 'InvalidBranchSessions', message: 'invalid step state', path: `$.sessions[].restoredStates.${step}` } };
      }
      restoredStates[step] = restored.value[step] as StepState;
    }
    sessions.push({ branch: branch.value, label: label.value, restoredStates });
  }
  return { ok: true, value: { sessions } };
};
