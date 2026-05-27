import {
  requireNullableBoolean,
  requireExactKeys,
  requireRecord,
  type RendererBoundaryErrorName,
  type RendererFactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidAuthStatus';

export type RendererAuthStatus = {
  copilotLoggedIn: boolean | null;
  githubLoggedIn: boolean | null;
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
