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
  const exactKeys = requireExactKeys<ErrorName>(root.value, ['hydratedFromDisk', 'theme']);
  if (!exactKeys.ok) {
    return exactKeys;
  }

  return { ok: true, value: { hydratedFromDisk: hydratedFromDisk.value, theme: theme.value } };
};
