export type FactoryError<Name extends string> = {
  name: Name;
  message: string;
  path: string;
};

export type FactoryResult<T, Name extends string> =
  | { ok: true; value: T }
  | { ok: false; error: FactoryError<Name> };

export const invalid = <Name extends string>(
  name: Name,
  message: string,
  path: string
): { ok: false; error: FactoryError<Name> } => ({
  ok: false,
  error: { name, message, path }
});

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const hasOnlyKeys = (value: Record<string, unknown>, keys: string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const requireRecord = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): { ok: true; value: Record<string, unknown> } | { ok: false; error: FactoryError<Name> } =>
  isRecord(value) ? { ok: true, value } : invalid(name, 'payload must be an object', path);

export const requireString = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): { ok: true; value: string } | { ok: false; error: FactoryError<Name> } =>
  typeof value === 'string' && value.length > 0
    ? { ok: true, value }
    : invalid(name, 'must be a non-empty string', path);

export const requireNumber = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): { ok: true; value: number } | { ok: false; error: FactoryError<Name> } =>
  typeof value === 'number' && Number.isFinite(value)
    ? { ok: true, value }
    : invalid(name, 'must be a finite number', path);

export const requireBoolean = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): { ok: true; value: boolean } | { ok: false; error: FactoryError<Name> } =>
  typeof value === 'boolean' ? { ok: true, value } : invalid(name, 'must be a boolean', path);

export const requireNullableBoolean = <Name extends string>(
  value: unknown,
  name: Name,
  path: string
): { ok: true; value: boolean | null } | { ok: false; error: FactoryError<Name> } =>
  typeof value === 'boolean' || value === null
    ? { ok: true, value }
    : invalid(name, 'must be a boolean or null', path);

export const requireExactKeys = <Name extends string>(
  value: Record<string, unknown>,
  keys: string[],
  name: Name,
  path: string
): { ok: true } | { ok: false; error: FactoryError<Name> } =>
  hasOnlyKeys(value, keys)
    ? { ok: true }
    : invalid(name, `payload must contain exactly ${keys.join(', ')}`, path);
