import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';
import type { ReviewEvidenceBody, ReviewEvidenceSummary } from '../domain/reviewEvidence';

type ErrorName = 'InvalidReviewEvidencePayload';

export type ReviewEvidenceRequest = {
  mode?: 'summary';
  repositoryPath: string;
  featureDir: string;
};

export type ReviewEvidenceBodyRequest = {
  mode: 'body';
  repositoryPath: string;
  featureDir: string;
  artifactPath: string;
};

export type ReviewEvidenceRequestPayload = ReviewEvidenceRequest | ReviewEvidenceBodyRequest;

export type ReviewEvidenceResponse = ReviewEvidenceSummary | ReviewEvidenceBody;

const safeAbsolutePath = (value: string): boolean => value.startsWith('/') && !value.includes('\0');
const safeArtifactPath = (value: string): boolean => value.length > 0 && !value.includes('\0');

export const createReviewEvidenceRequest = (value: unknown): FactoryResult<ReviewEvidenceRequestPayload, ErrorName> => {
  const root = requireRecord(value, 'InvalidReviewEvidencePayload', '$');
  if (!root.ok) return root;
  const mode = root.value.mode === 'body' ? 'body' : 'summary';
  const expectedKeys = mode === 'body'
    ? ['mode', 'repositoryPath', 'featureDir', 'artifactPath']
    : Object.prototype.hasOwnProperty.call(root.value, 'mode')
      ? ['mode', 'repositoryPath', 'featureDir']
      : ['repositoryPath', 'featureDir'];
  const keys = requireExactKeys(root.value, expectedKeys, 'InvalidReviewEvidencePayload', '$');
  if (!keys.ok) return keys;
  const repositoryPath = requireString(root.value.repositoryPath, 'InvalidReviewEvidencePayload', '$.repositoryPath');
  const featureDir = requireString(root.value.featureDir, 'InvalidReviewEvidencePayload', '$.featureDir');
  if (!repositoryPath.ok) return repositoryPath;
  if (!featureDir.ok) return featureDir;
  if (!safeAbsolutePath(repositoryPath.value) || !safeAbsolutePath(featureDir.value)) {
    return invalid('InvalidReviewEvidencePayload', 'paths must be absolute and safe', '$');
  }
  if (mode === 'body') {
    const artifactPath = requireString(root.value.artifactPath, 'InvalidReviewEvidencePayload', '$.artifactPath');
    if (!artifactPath.ok) return artifactPath;
    if (!safeArtifactPath(artifactPath.value)) {
      return invalid('InvalidReviewEvidencePayload', 'artifactPath must be safe', '$.artifactPath');
    }
    return { ok: true, value: { mode, repositoryPath: repositoryPath.value, featureDir: featureDir.value, artifactPath: artifactPath.value } };
  }
  return { ok: true, value: { mode, repositoryPath: repositoryPath.value, featureDir: featureDir.value } };
};

export const createReviewEvidenceResponse = (value: ReviewEvidenceResponse): FactoryResult<ReviewEvidenceResponse, ErrorName> => ({
  ok: true,
  value
});
