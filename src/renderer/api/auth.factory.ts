import {
  requireNullableBoolean,
  requireExactKeys,
  requireRecord,
  type RendererBoundaryErrorName,
  type RendererFactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidAuthStatus';
type LoginErrorName = 'InvalidAuthLogin';

export type RendererAuthStatus = {
  copilotLoggedIn: boolean | null;
  githubLoggedIn: boolean | null;
};

export type RendererAuthLoginResult = {
  status: 'ok';
  provider: 'github' | 'copilot' | 'atlassian';
  identity?: {
    login: string;
    displayName?: string;
    avatarUrl?: string;
  };
  label?: string;
};

export const parseRendererAuthStatus = (
  value: unknown
): RendererFactoryResult<RendererAuthStatus, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidAuthStatus', '$');
  if (!root.ok) {
    return root;
  }
  const copilotLoggedIn = requireNullableBoolean(root.value.copilotLoggedIn, 'InvalidAuthStatus', '$.copilotLoggedIn');
  if (!copilotLoggedIn.ok) {
    return copilotLoggedIn;
  }
  const githubLoggedIn = requireNullableBoolean(root.value.githubLoggedIn, 'InvalidAuthStatus', '$.githubLoggedIn');
  if (!githubLoggedIn.ok) {
    return githubLoggedIn;
  }
  const exactKeys = requireExactKeys<ErrorName>(root.value, ['copilotLoggedIn', 'githubLoggedIn']);
  if (!exactKeys.ok) {
    return exactKeys;
  }

  return { ok: true, value: { copilotLoggedIn: copilotLoggedIn.value, githubLoggedIn: githubLoggedIn.value } };
};

export const parseRendererAuthLoginResult = (
  value: unknown
): RendererFactoryResult<RendererAuthLoginResult, RendererBoundaryErrorName<LoginErrorName>> => {
  const root = requireRecord(value, 'InvalidAuthLogin', '$');
  if (!root.ok) return root;
  const exactKeys = requireExactKeys<LoginErrorName>(root.value, ['status', 'provider', 'identity', 'label']);
  if (!exactKeys.ok) return exactKeys;
  if (root.value.status !== 'ok') {
    return { ok: false, error: { name: 'InvalidAuthLogin', message: 'status must be ok', path: '$.status' } };
  }
  if (root.value.provider !== 'github' && root.value.provider !== 'copilot' && root.value.provider !== 'atlassian') {
    return { ok: false, error: { name: 'InvalidAuthLogin', message: 'provider is invalid', path: '$.provider' } };
  }
  const result: RendererAuthLoginResult = { status: 'ok', provider: root.value.provider };
  if (root.value.identity !== undefined) {
    const identity = requireRecord(root.value.identity, 'InvalidAuthLogin', '$.identity');
    if (!identity.ok) return identity;
    const login = typeof identity.value.login === 'string' ? identity.value.login : undefined;
    if (login === undefined) {
      return { ok: false, error: { name: 'InvalidAuthLogin', message: 'identity.login must be a string', path: '$.identity.login' } };
    }
    result.identity = {
      login,
      displayName: typeof identity.value.displayName === 'string' ? identity.value.displayName : undefined,
      avatarUrl: typeof identity.value.avatarUrl === 'string' ? identity.value.avatarUrl : undefined
    };
  }
  result.label = typeof root.value.label === 'string' ? root.value.label : undefined;
  if (result.provider === 'atlassian' && 'token' in root.value) {
    return { ok: false, error: { name: 'InvalidAuthLogin', message: 'Atlassian stub must not expose OAuth tokens', path: '$.token' } };
  }
  return { ok: true, value: result };
};
