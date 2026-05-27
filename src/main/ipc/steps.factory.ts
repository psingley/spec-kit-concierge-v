import {
  invalid,
  isRecord,
  isStringArray,
  requireExactKeys,
  requireRecord,
  requireString,
  type FactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidStepsReadPayload';

export type StepCommitInput = {
  sha: string;
  message: string;
};

export type StepReadRequest = {
  commits: StepCommitInput[];
};

export type StepReadRecord = {
  id: string;
  status: string;
  commitSha: string;
  interpretation: 'exact' | 'normalized' | 'partial';
  warnings: string[];
};

export type StepReadResponse = {
  steps: StepReadRecord[];
};

export const createStepsReadRequest = (value: unknown): FactoryResult<StepReadRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidStepsReadPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['commits'], 'InvalidStepsReadPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  if (!Array.isArray(root.value.commits)) {
    return invalid('InvalidStepsReadPayload', 'commits must be an array', '$.commits');
  }

  const commits: StepCommitInput[] = [];
  for (const [index, commit] of root.value.commits.entries()) {
    if (!isRecord(commit)) {
      return invalid('InvalidStepsReadPayload', 'commit must be an object', `$.commits[${index}]`);
    }
    const sha = requireString(commit.sha, 'InvalidStepsReadPayload', `$.commits[${index}].sha`);
    if (!sha.ok) {
      return sha;
    }
    const message = requireString(commit.message, 'InvalidStepsReadPayload', `$.commits[${index}].message`);
    if (!message.ok) {
      return message;
    }
    commits.push({ sha: sha.value, message: message.value });
  }

  return { ok: true, value: { commits } };
};

export const createStepsReadResponse = (value: unknown): FactoryResult<StepReadResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidStepsReadPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['steps'], 'InvalidStepsReadPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  if (!Array.isArray(root.value.steps)) {
    return invalid('InvalidStepsReadPayload', 'steps must be an array', '$.steps');
  }

  const steps: StepReadRecord[] = [];
  for (const [index, step] of root.value.steps.entries()) {
    if (!isRecord(step)) {
      return invalid('InvalidStepsReadPayload', 'step must be an object', `$.steps[${index}]`);
    }
    const id = requireString(step.id, 'InvalidStepsReadPayload', `$.steps[${index}].id`);
    if (!id.ok) {
      return id;
    }
    const status = requireString(step.status, 'InvalidStepsReadPayload', `$.steps[${index}].status`);
    if (!status.ok) {
      return status;
    }
    const commitSha = requireString(step.commitSha, 'InvalidStepsReadPayload', `$.steps[${index}].commitSha`);
    if (!commitSha.ok) {
      return commitSha;
    }
    if (step.interpretation !== 'exact' && step.interpretation !== 'normalized' && step.interpretation !== 'partial') {
      return invalid('InvalidStepsReadPayload', 'interpretation must be known', `$.steps[${index}].interpretation`);
    }
    if (!isStringArray(step.warnings)) {
      return invalid('InvalidStepsReadPayload', 'warnings must be a string array', `$.steps[${index}].warnings`);
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
