export type RendererFactoryError<Name extends string> = {
  name: Name;
  message: string;
  path: string;
};

export type RendererFactoryResult<T, Name extends string> =
  | { ok: true; value: T }
  | { ok: false; error: RendererFactoryError<Name> };

export type RendererBoundaryErrorName<Name extends string> = Name | 'InvalidRendererBoundaryPayload';

export const invalid = <Name extends string>(
  name: Name,
  message: string,
  path: string
): { ok: false; error: RendererFactoryError<Name> } => ({
  ok: false,
  error: { name, message, path }
});

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const requireRecord = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): { ok: true; value: Record<string, unknown> } | { ok: false; error: RendererFactoryError<Name> } =>
  isRecord(value) ? { ok: true, value } : invalid(name, 'payload must be an object', path);

export const requireString = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): { ok: true; value: string } | { ok: false; error: RendererFactoryError<Name> } =>
  typeof value === 'string' && value.length > 0
    ? { ok: true, value }
    : invalid(name, 'must be a non-empty string', path);

export const requireNumber = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): { ok: true; value: number } | { ok: false; error: RendererFactoryError<Name> } =>
  typeof value === 'number' && Number.isFinite(value)
    ? { ok: true, value }
    : invalid(name, 'must be a finite number', path);

export const requireBoolean = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): { ok: true; value: boolean } | { ok: false; error: RendererFactoryError<Name> } =>
  typeof value === 'boolean' ? { ok: true, value } : invalid(name, 'must be a boolean', path);

export const requireNullableBoolean = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): { ok: true; value: boolean | null } | { ok: false; error: RendererFactoryError<Name> } =>
  typeof value === 'boolean' || value === null
    ? { ok: true, value }
    : invalid(name, 'must be a boolean or null', path);

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const requireExactKeys = <Name extends string>(
  value: Record<string, unknown>,
  allowedKeys: readonly string[]
): { ok: true } | { ok: false; error: RendererFactoryError<RendererBoundaryErrorName<Name>> } => {
  const allowed = new Set(allowedKeys);
  const extraKey = Object.keys(value).find((key) => !allowed.has(key));

  return extraKey === undefined
    ? { ok: true }
    : invalid('InvalidRendererBoundaryPayload', 'payload contains an unexpected key', `$.${extraKey}`);
};
