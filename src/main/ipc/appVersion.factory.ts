export type AppVersionPayload = {
  version: string;
};

export type AppVersionFactoryError = {
  name: 'InvalidAppVersionPayload';
  message: string;
};

export type AppVersionFactoryResult =
  | { ok: true; value: AppVersionPayload }
  | { ok: false; error: AppVersionFactoryError };

const invalid = (message: string): AppVersionFactoryResult => ({
  ok: false,
  error: {
    name: 'InvalidAppVersionPayload',
    message
  }
});

export const createAppVersionPayload = (value: unknown): AppVersionFactoryResult => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalid('payload must be an object');
  }

  const entries = Object.entries(value as Record<string, unknown>);

  if (entries.length !== 1) {
    return invalid('payload must contain only version');
  }

  const version = (value as { version?: unknown }).version;

  if (typeof version !== 'string' || version.length === 0) {
    return invalid('version must be a non-empty string');
  }

  return {
    ok: true,
    value: {
      version
    }
  };
};
