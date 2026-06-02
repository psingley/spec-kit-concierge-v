import {
  GUARDED_DOCTOR_TOOLS,
  READ_ONLY_DOCTOR_TOOLS,
  type DoctorTool,
  type StepName
} from '../manifest/types';
import {
  invalid,
  rejectUnknownKeys,
  requireNonEmptyString,
  requireRecord,
  requireStepName,
  type ManifestFactoryResult
} from '../manifest/factoryUtils';

export const READ_ONLY_DOCTOR_TOOL_NAMES = [...READ_ONLY_DOCTOR_TOOLS] as const;
export const GUARDED_DOCTOR_TOOL_NAMES = [...GUARDED_DOCTOR_TOOLS] as const;
export const DOCTOR_TOOL_NAMES = [...READ_ONLY_DOCTOR_TOOL_NAMES, ...GUARDED_DOCTOR_TOOL_NAMES] as const;

export type DoctorToolRequest = {
  invocationId: string;
  step: StepName;
  attemptNumber: 1 | 2;
  tool: DoctorTool;
  arguments: Record<string, unknown>;
};

const isDoctorTool = (value: unknown): value is DoctorTool =>
  typeof value === 'string' && DOCTOR_TOOL_NAMES.includes(value as DoctorTool);

export const createDoctorToolRequest = (
  value: unknown
): ManifestFactoryResult<DoctorToolRequest, 'InvalidDoctorToolRequest'> => {
  const root = requireRecord(value, 'InvalidDoctorToolRequest', '$');
  if (!root.ok) return root;

  const keys = rejectUnknownKeys(
    root.value,
    ['invocationId', 'step', 'attemptNumber', 'tool', 'arguments'],
    'InvalidDoctorToolRequest',
    '$'
  );
  if (!keys.ok) return keys;

  const invocationId = requireNonEmptyString(root.value.invocationId, 'InvalidDoctorToolRequest', '$.invocationId');
  if (!invocationId.ok) return invocationId;
  const step = requireStepName(root.value.step, 'InvalidDoctorToolRequest', '$.step');
  if (!step.ok) return step;
  if (root.value.attemptNumber !== 1 && root.value.attemptNumber !== 2) {
    return invalid('InvalidDoctorToolRequest', 'doctor attempt number must be 1 or 2', '$.attemptNumber');
  }
  if (!isDoctorTool(root.value.tool)) {
    return invalid('InvalidDoctorToolRequest', 'tool must be an approved doctor tool', '$.tool');
  }
  const args = requireRecord(root.value.arguments, 'InvalidDoctorToolRequest', '$.arguments');
  if (!args.ok) return args;

  return {
    ok: true,
    value: {
      invocationId: invocationId.value,
      step: step.value,
      attemptNumber: root.value.attemptNumber,
      tool: root.value.tool,
      arguments: args.value
    }
  };
};
