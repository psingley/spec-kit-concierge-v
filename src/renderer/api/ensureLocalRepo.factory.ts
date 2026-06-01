import { requireBoolean, requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';

type ErrorName = 'InvalidEnsureLocalRepo';

export type RendererEnsureLocalRepo = {
  localPath: string;
  cloned: boolean;
};

export const parseRendererEnsureLocalRepo = (
  value: unknown
): RendererFactoryResult<RendererEnsureLocalRepo, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidEnsureLocalRepo', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['localPath', 'cloned']);
  if (!keys.ok) return keys;
  const localPath = requireString(root.value.localPath, 'InvalidEnsureLocalRepo', '$.localPath');
  if (!localPath.ok) return localPath;
  const cloned = requireBoolean(root.value.cloned, 'InvalidEnsureLocalRepo', '$.cloned');
  if (!cloned.ok) return cloned;
  return { ok: true, value: { localPath: localPath.value, cloned: cloned.value } };
};
