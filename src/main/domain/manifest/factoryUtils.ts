import { STEP_NAMES, type StepName } from './types';

export type ManifestFactoryErrorName =
  | 'InvalidSessionManifest'
  | 'InvalidStepAttempt'
  | 'InvalidAnomaly'
  | 'InvalidIntervention'
  | 'InvalidDoctorTool'
  | 'InvalidNudgeRequest'
  | 'InvalidRendererBoundaryPayload';

export type ManifestFactoryError<Name extends string = ManifestFactoryErrorName> = {
  name: Name;
  message: string;
  path: string;
};

export type ManifestFactoryResult<T, Name extends string = ManifestFactoryErrorName> =
  | { ok: true; value: T }
  | { ok: false; error: ManifestFactoryError<Name> };

export const invalid = <Name extends string>(
  name: Name,
  message: string,
  path: string
): { ok: false; error: ManifestFactoryError<Name> } => ({
  ok: false,
  error: { name, message, path }
});

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const rejectUnknownKeys = <Name extends string>(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  name: Name,
  path: string
): ManifestFactoryResult<Record<string, unknown>, Name> => {
  const allowed = new Set(allowedKeys);
  const extraKey = Object.keys(value).find((key) => !allowed.has(key));

  return extraKey === undefined
    ? { ok: true, value }
    : invalid(name, 'payload contains an unexpected key', `${path}.${extraKey}`);
};

export const requireRecord = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): ManifestFactoryResult<Record<string, unknown>, Name> =>
  isRecord(value) ? { ok: true, value } : invalid(name, 'payload must be an object', path);

export const requireNonEmptyString = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): ManifestFactoryResult<string, Name> =>
  typeof value === 'string' && value.trim().length > 0
    ? { ok: true, value }
    : invalid(name, 'must be a non-empty string', path);

export const requireIsoTimestamp = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): ManifestFactoryResult<string, Name> => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return invalid(name, 'must be an ISO timestamp string', path);
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) || new Date(timestamp).toISOString() !== value
    ? invalid(name, 'must be an ISO timestamp string', path)
    : { ok: true, value };
};

export const isStepName = (value: unknown): value is StepName =>
  typeof value === 'string' && STEP_NAMES.includes(value as StepName);

export const requireStepName = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): ManifestFactoryResult<StepName, Name> =>
  isStepName(value) ? { ok: true, value } : invalid(name, 'must be a canonical step name', path);

export const requireArray = <T, Name extends string>(
  value: unknown,
  name: Name,
  path: string,
  parseItem: (item: unknown, itemPath: string) => ManifestFactoryResult<T, Name>
): ManifestFactoryResult<T[], Name> => {
  if (!Array.isArray(value)) {
    return invalid(name, 'must be an array', path);
  }

  const parsed: T[] = [];
  for (const [index, item] of value.entries()) {
    const result = parseItem(item, `${path}[${index}]`);
    if (!result.ok) return result;
    parsed.push(result.value);
  }

  return { ok: true, value: parsed };
};
