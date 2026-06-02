import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';

export type SessionManifestBoundaryRequest = {
  repositoryPath: string;
};

const parse = (value: unknown): FactoryResult<SessionManifestBoundaryRequest, 'InvalidSessionManifestPayload'> => {
  const root = requireRecord(value, 'InvalidSessionManifestPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['repositoryPath'], 'InvalidSessionManifestPayload', '$');
  if (!keys.ok) return keys;
  const repositoryPath = requireString(root.value.repositoryPath, 'InvalidSessionManifestPayload', '$.repositoryPath');
  if (!repositoryPath.ok) return repositoryPath;
  if (repositoryPath.value.trim().length === 0) {
    return invalid('InvalidSessionManifestPayload', 'repositoryPath must not be blank', '$.repositoryPath');
  }
  return { ok: true, value: { repositoryPath: repositoryPath.value } };
};

export const createSessionManifestReadRequest = parse;
export const createSessionManifestReconcileRequest = parse;
export const createSessionManifestAuditRequest = parse;
export const createSessionManifestDoctorStatusRequest = parse;
