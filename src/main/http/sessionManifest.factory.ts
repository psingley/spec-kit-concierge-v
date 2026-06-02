import { invalid, isRecord, type FactoryResult } from '../ipc/factoryUtils';

export type SessionManifestHttpBoundaryRequest = {
  repositoryPath: string;
};

const parse = (value: unknown): FactoryResult<SessionManifestHttpBoundaryRequest, 'InvalidSessionManifestHttpPayload'> => {
  if (!isRecord(value)) {
    return invalid('InvalidSessionManifestHttpPayload', 'payload must be an object', '$');
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== 'repositoryPath') {
    return invalid('InvalidSessionManifestHttpPayload', 'payload must contain exactly repositoryPath', '$');
  }
  if (typeof value.repositoryPath !== 'string' || value.repositoryPath.trim().length === 0) {
    return invalid('InvalidSessionManifestHttpPayload', 'repositoryPath must be a non-empty string', '$.repositoryPath');
  }
  return { ok: true, value: { repositoryPath: value.repositoryPath } };
};

export const createSessionManifestHttpReadRequest = parse;
export const createSessionManifestHttpReconcileRequest = parse;
export const createSessionManifestHttpAuditRequest = parse;
export const createSessionManifestHttpDoctorStatusRequest = parse;
