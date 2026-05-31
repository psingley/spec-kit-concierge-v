import {
  invalid,
  isStringArray,
  optionalString,
  requireExactKeys,
  requireNullableBoolean,
  requireRecord,
  type FactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidAuthStatusPayload';
type LoginErrorName = 'InvalidAuthLoginPayload';

export type AuthStatusRequest = {
  providers: Array<'copilot' | 'github'>;
};

export type AuthStatusResponse = {
  copilotLoggedIn: boolean | null;
  githubLoggedIn: boolean | null;
};

export type AuthLoginRequest = {
  provider: 'github' | 'copilot' | 'atlassian';
};

export type AuthLoginResponse = {
  status: 'ok';
  provider: 'github' | 'copilot' | 'atlassian';
  identity?: {
    login: string;
    displayName?: string;
    avatarUrl?: string;
  };
  label?: string;
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

export const createAuthLoginRequest = (
  value: unknown,
  provider: AuthLoginRequest['provider']
): FactoryResult<AuthLoginRequest, LoginErrorName> => {
  const root = requireRecord(value, 'InvalidAuthLoginPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['provider'], 'InvalidAuthLoginPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  if (root.value.provider !== provider) {
    return invalid('InvalidAuthLoginPayload', `provider must be ${provider}`, '$.provider');
  }
  return { ok: true, value: { provider } };
};

export const createAuthLoginResponse = (value: unknown): FactoryResult<AuthLoginResponse, LoginErrorName> => {
  const root = requireRecord(value, 'InvalidAuthLoginPayload', '$');
  if (!root.ok) {
    return root;
  }
  const allowed = ['status', 'provider', 'identity', 'label'];
  if (!Object.keys(root.value).every((key) => allowed.includes(key))) {
    return invalid('InvalidAuthLoginPayload', 'payload contains an unexpected key', '$');
  }
  if (root.value.status !== 'ok') {
    return invalid('InvalidAuthLoginPayload', 'status must be ok', '$.status');
  }
  if (root.value.provider !== 'github' && root.value.provider !== 'copilot' && root.value.provider !== 'atlassian') {
    return invalid('InvalidAuthLoginPayload', 'provider must be github, copilot, or atlassian', '$.provider');
  }
  const response: AuthLoginResponse = { status: 'ok', provider: root.value.provider };
  if (root.value.identity !== undefined) {
    const identity = requireRecord(root.value.identity, 'InvalidAuthLoginPayload', '$.identity');
    if (!identity.ok) {
      return identity;
    }
    const login = typeof identity.value.login === 'string' ? identity.value.login : undefined;
    if (login === undefined) {
      return invalid('InvalidAuthLoginPayload', 'identity.login must be a string', '$.identity.login');
    }
    response.identity = {
      login,
      displayName: optionalString(identity.value.displayName),
      avatarUrl: optionalString(identity.value.avatarUrl)
    };
  }
  response.label = optionalString(root.value.label);
  if (response.provider === 'atlassian' && (root.value as Record<string, unknown>).token !== undefined) {
    return invalid('InvalidAuthLoginPayload', 'Atlassian login response must not include OAuth tokens', '$.token');
  }
  return { ok: true, value: response };
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
