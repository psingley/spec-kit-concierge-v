import {
  invalid,
  isRecord,
  isStringArray,
  requireExactKeys,
  requireRecord,
  requireString,
  type RendererBoundaryErrorName,
  type RendererFactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidStepState';

export type RendererStepStateRecord = {
  id: string;
  status: string;
  commitSha: string;
  interpretation: 'exact' | 'normalized' | 'partial';
  warnings: string[];
};

export type RendererStepState = {
  steps: RendererStepStateRecord[];
};

export const parseRendererStepState = (
  value: unknown
): RendererFactoryResult<RendererStepState, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidStepState', '$');
  if (!root.ok) {
    return root;
  }
  if (!Array.isArray(root.value.steps)) {
    return invalid('InvalidStepState', 'steps must be an array', '$.steps');
  }
  const exactKeys = requireExactKeys<ErrorName>(root.value, ['steps']);
  if (!exactKeys.ok) {
    return exactKeys;
  }
  const steps: RendererStepStateRecord[] = [];
  for (const [index, step] of root.value.steps.entries()) {
    if (!isRecord(step)) {
      return invalid('InvalidStepState', 'step must be an object', `$.steps[${index}]`);
    }
    const id = requireString(step.id, 'InvalidStepState', `$.steps[${index}].id`);
    if (!id.ok) {
      return id;
    }
    const status = requireString(step.status, 'InvalidStepState', `$.steps[${index}].status`);
    if (!status.ok) {
      return status;
    }
    const commitSha = requireString(step.commitSha, 'InvalidStepState', `$.steps[${index}].commitSha`);
    if (!commitSha.ok) {
      return commitSha;
    }
    if (step.interpretation !== 'exact' && step.interpretation !== 'normalized' && step.interpretation !== 'partial') {
      return invalid('InvalidStepState', 'interpretation must be known', `$.steps[${index}].interpretation`);
    }
    if (!isStringArray(step.warnings)) {
      return invalid('InvalidStepState', 'warnings must be a string array', `$.steps[${index}].warnings`);
    }
    steps.push({
      id: id.value,
      status: status.value,
      commitSha: commitSha.value,
      interpretation: step.interpretation,
      warnings: step.warnings
    });
  }

  return { ok: true, value: { steps } };
};
