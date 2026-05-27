import {
  invalid,
  requireExactKeys,
  requireRecord,
  type FactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidPreferencesPayload';

export type PreferenceTheme = 'system' | 'light' | 'dark';

export type PreferencesReadRequest = {
  scope: 'user';
};

export type PreferencesPayload = {
  hydratedFromDisk: boolean;
  theme: PreferenceTheme;
};

export type PreferencesWriteRequest = {
  theme: PreferenceTheme;
};

const parseTheme = (value: unknown): FactoryResult<PreferenceTheme, ErrorName> =>
  value === 'system' || value === 'light' || value === 'dark'
    ? { ok: true, value }
    : invalid('InvalidPreferencesPayload', 'theme must be system, light, or dark', '$.theme');

export const createPreferencesReadRequest = (
  value: unknown
): FactoryResult<PreferencesReadRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidPreferencesPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['scope'], 'InvalidPreferencesPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  if (root.value.scope !== 'user') {
    return invalid('InvalidPreferencesPayload', 'scope must be user', '$.scope');
  }

  return { ok: true, value: { scope: 'user' } };
};

export const createPreferencesPayload = (
  value: unknown
): FactoryResult<PreferencesPayload, ErrorName> => {
  const root = requireRecord(value, 'InvalidPreferencesPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['hydratedFromDisk', 'theme'], 'InvalidPreferencesPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  if (typeof root.value.hydratedFromDisk !== 'boolean') {
    return invalid('InvalidPreferencesPayload', 'hydratedFromDisk must be a boolean', '$.hydratedFromDisk');
  }
  const theme = parseTheme(root.value.theme);
  if (!theme.ok) {
    return theme;
  }

  return { ok: true, value: { hydratedFromDisk: root.value.hydratedFromDisk, theme: theme.value } };
};

export const createPreferencesWriteRequest = (
  value: unknown
): FactoryResult<PreferencesWriteRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidPreferencesPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['theme'], 'InvalidPreferencesPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  const theme = parseTheme(root.value.theme);
  if (!theme.ok) {
    return theme;
  }

  return { ok: true, value: { theme: theme.value } };
};
