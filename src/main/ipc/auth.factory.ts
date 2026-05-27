import {
  invalid,
  isStringArray,
  requireExactKeys,
  requireNullableBoolean,
  requireRecord,
  type FactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidAuthStatusPayload';

export type AuthStatusRequest = {
  providers: Array<'copilot' | 'github'>;
};

export type AuthStatusResponse = {
  copilotLoggedIn: boolean | null;
  githubLoggedIn: boolean | null;
};

export const createAuthStatusRequest = (value: unknown): FactoryResult<AuthStatusRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidAuthStatusPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['providers'], 'InvalidAuthStatusPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  if (!isStringArray(root.value.providers)) {
    return invalid('InvalidAuthStatusPayload', 'providers must be a string array', '$.providers');
  }
  if (!root.value.providers.every((provider) => provider === 'copilot' || provider === 'github')) {
    return invalid('InvalidAuthStatusPayload', 'providers must include only copilot or github', '$.providers');
  }

  return { ok: true, value: { providers: root.value.providers } };
};

export const createAuthStatusResponse = (value: unknown): FactoryResult<AuthStatusResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidAuthStatusPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(
    root.value,
    ['copilotLoggedIn', 'githubLoggedIn'],
    'InvalidAuthStatusPayload',
    '$'
  );
  if (!keys.ok) {
    return keys;
  }
  const copilotLoggedIn = requireNullableBoolean(
    root.value.copilotLoggedIn,
    'InvalidAuthStatusPayload',
    '$.copilotLoggedIn'
  );
  if (!copilotLoggedIn.ok) {
    return copilotLoggedIn;
  }
  const githubLoggedIn = requireNullableBoolean(
    root.value.githubLoggedIn,
    'InvalidAuthStatusPayload',
    '$.githubLoggedIn'
  );
  if (!githubLoggedIn.ok) {
    return githubLoggedIn;
  }

  return {
    ok: true,
    value: { copilotLoggedIn: copilotLoggedIn.value, githubLoggedIn: githubLoggedIn.value }
  };
};
