import {
  invalid,
  requireBoolean,
  requireExactKeys,
  requireRecord,
  type RendererBoundaryErrorName,
  type RendererFactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidPreferencesState';

export type RendererPreferenceTheme = 'system' | 'light' | 'dark';

export type RendererPreferencesState = {
  hydratedFromDisk: boolean;
  theme: RendererPreferenceTheme;
  accent?: string;
  density?: 'compact' | 'comfortable';
  activitySide?: 'left' | 'right' | 'hidden';
  requireScrollToUnlock?: boolean;
  recentRepositories?: string[];
  selectedCopilotModel?: string | null;
};

const parseTheme = (value: unknown): RendererFactoryResult<RendererPreferenceTheme, ErrorName> =>
  value === 'system' || value === 'light' || value === 'dark'
    ? { ok: true, value }
    : invalid('InvalidPreferencesState', 'theme must be system, light, or dark', '$.theme');

export const parseRendererPreferences = (
  value: unknown
): RendererFactoryResult<RendererPreferencesState, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidPreferencesState', '$');
  if (!root.ok) {
    return root;
  }
  const hydratedFromDisk = requireBoolean(root.value.hydratedFromDisk, 'InvalidPreferencesState', '$.hydratedFromDisk');
  if (!hydratedFromDisk.ok) {
    return hydratedFromDisk;
  }
  const theme = parseTheme(root.value.theme);
  if (!theme.ok) {
    return theme;
  }
  const exactKeys = requireExactKeys<ErrorName>(root.value, ['hydratedFromDisk', 'theme', 'accent', 'density', 'activitySide', 'requireScrollToUnlock', 'recentRepositories', 'selectedCopilotModel']);
  if (!exactKeys.ok) {
    return exactKeys;
  }

  return {
    ok: true,
    value: {
      hydratedFromDisk: hydratedFromDisk.value,
      theme: theme.value,
      accent: typeof root.value.accent === 'string' ? root.value.accent : undefined,
      density: root.value.density === 'compact' || root.value.density === 'comfortable' ? root.value.density : undefined,
      activitySide: root.value.activitySide === 'left' || root.value.activitySide === 'right' || root.value.activitySide === 'hidden' ? root.value.activitySide : undefined,
      requireScrollToUnlock: typeof root.value.requireScrollToUnlock === 'boolean' ? root.value.requireScrollToUnlock : undefined,
      recentRepositories: Array.isArray(root.value.recentRepositories) && root.value.recentRepositories.every((item) => typeof item === 'string') ? root.value.recentRepositories : undefined,
      selectedCopilotModel: typeof root.value.selectedCopilotModel === 'string' || root.value.selectedCopilotModel === null ? root.value.selectedCopilotModel : undefined
    }
  };
};
