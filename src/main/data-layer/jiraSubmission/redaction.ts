const BASIC_AUTH_PATTERN = /\bAuthorization\s*:\s*Basic\s+[A-Za-z0-9+/=]+/gi;
const BASIC_VALUE_PATTERN = /\bBasic\s+[A-Za-z0-9+/=]{8,}/g;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const secretKey = (key: string): boolean =>
  key.toLowerCase() === 'token' || key.toLowerCase() === 'authorization';

const scrubString = (value: string, secrets: readonly string[]): string => {
  let scrubbed = value
    .replace(BASIC_AUTH_PATTERN, '[REDACTED]')
    .replace(BASIC_VALUE_PATTERN, '[REDACTED]');
  for (const secret of secrets) {
    if (secret.length > 0) {
      scrubbed = scrubbed.split(secret).join('[REDACTED]');
    }
  }
  return scrubbed;
};

export const sanitizeForSecrets = (value: unknown, secrets: readonly string[] = []): unknown => {
  if (typeof value === 'string') return scrubString(value, secrets);
  if (Array.isArray(value)) return value.map((item) => sanitizeForSecrets(item, secrets));
  if (!isRecord(value)) return value;

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (secretKey(key)) {
      result['[REDACTED_KEY]'] = '[REDACTED]';
      continue;
    }
    result[key] = sanitizeForSecrets(child, secrets);
  }
  return result;
};

export const sanitizeErrorMessage = (error: unknown, secrets: readonly string[] = []): string => {
  const message = error instanceof Error ? error.message : String(error);
  return scrubString(message, secrets);
};
