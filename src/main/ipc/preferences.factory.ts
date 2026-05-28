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
  accent?: string;
  density?: 'compact' | 'comfortable';
  activitySide?: 'left' | 'right' | 'hidden';
  requireScrollToUnlock?: boolean;
  recentRepositories?: string[];
  selectedCopilotModel?: string | null;
};

export type PreferencesWriteRequest = {
  theme: PreferenceTheme;
  accent?: string;
  density?: 'compact' | 'comfortable';
  activitySide?: 'left' | 'right' | 'hidden';
  requireScrollToUnlock?: boolean;
  recentRepositories?: string[];
  selectedCopilotModel?: string | null;
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
  const allowed = ['hydratedFromDisk', 'theme', 'accent', 'density', 'activitySide', 'requireScrollToUnlock', 'recentRepositories', 'selectedCopilotModel'];
  if (!Object.keys(root.value).every((key) => allowed.includes(key))) {
    return invalid('InvalidPreferencesPayload', 'payload contains an unexpected key', '$');
  }
  const keys = root.value.hydratedFromDisk !== undefined && root.value.theme !== undefined ? { ok: true as const } : invalid('InvalidPreferencesPayload', 'payload must include hydratedFromDisk and theme', '$');
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

  return {
    ok: true,
    value: {
      hydratedFromDisk: root.value.hydratedFromDisk,
      theme: theme.value,
      accent: typeof root.value.accent === 'string' ? root.value.accent : undefined,
      density: root.value.density === 'compact' || root.value.density === 'comfortable' ? root.value.density : undefined,
      activitySide:
        root.value.activitySide === 'left' || root.value.activitySide === 'right' || root.value.activitySide === 'hidden'
          ? root.value.activitySide
          : undefined,
      requireScrollToUnlock: typeof root.value.requireScrollToUnlock === 'boolean' ? root.value.requireScrollToUnlock : undefined,
      recentRepositories: Array.isArray(root.value.recentRepositories) && root.value.recentRepositories.every((item) => typeof item === 'string') ? root.value.recentRepositories : undefined,
      selectedCopilotModel: typeof root.value.selectedCopilotModel === 'string' || root.value.selectedCopilotModel === null ? root.value.selectedCopilotModel : undefined
    }
  };
};

export const createPreferencesWriteRequest = (
  value: unknown
): FactoryResult<PreferencesWriteRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidPreferencesPayload', '$');
  if (!root.ok) {
    return root;
  }
  const allowed = ['theme', 'accent', 'density', 'activitySide', 'requireScrollToUnlock', 'recentRepositories', 'selectedCopilotModel'];
  if (!Object.keys(root.value).every((key) => allowed.includes(key))) {
    return invalid('InvalidPreferencesPayload', 'payload contains an unexpected key', '$');
  }
  const theme = parseTheme(root.value.theme);
  if (!theme.ok) {
    return theme;
  }

  return {
    ok: true,
    value: {
      theme: theme.value,
      accent: typeof root.value.accent === 'string' ? root.value.accent : undefined,
      density: root.value.density === 'compact' || root.value.density === 'comfortable' ? root.value.density : undefined,
      activitySide:
        root.value.activitySide === 'left' || root.value.activitySide === 'right' || root.value.activitySide === 'hidden'
          ? root.value.activitySide
          : undefined,
      requireScrollToUnlock: typeof root.value.requireScrollToUnlock === 'boolean' ? root.value.requireScrollToUnlock : undefined,
      recentRepositories: Array.isArray(root.value.recentRepositories) && root.value.recentRepositories.every((item) => typeof item === 'string') ? root.value.recentRepositories : undefined,
      selectedCopilotModel: typeof root.value.selectedCopilotModel === 'string' || root.value.selectedCopilotModel === null ? root.value.selectedCopilotModel : undefined
    }
  };
};
