import path from 'node:path';
import { invalid, requireExactKeys, requireNumber, requireRecord, requireString, type FactoryResult } from './factoryUtils';

type ErrorName = 'InvalidArtifactsPayload';

export type ArtifactReadRequest = { repositoryPath: string; artifactPath: string };
export type ArtifactReadResponse = { artifactPath: string; text: string; size: number; mtimeMs: number };

const safeRelativePath = (value: string): boolean =>
  value.length > 0 && !path.isAbsolute(value) && !path.win32.isAbsolute(value) && !value.includes('..') && !value.includes('\\');

export const createArtifactReadRequest = (value: unknown): FactoryResult<ArtifactReadRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidArtifactsPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['repositoryPath', 'artifactPath'], 'InvalidArtifactsPayload', '$');
  if (!keys.ok) return keys;
  const repositoryPath = requireString(root.value.repositoryPath, 'InvalidArtifactsPayload', '$.repositoryPath');
  const artifactPath = requireString(root.value.artifactPath, 'InvalidArtifactsPayload', '$.artifactPath');
  if (!repositoryPath.ok) return repositoryPath;
  if (!artifactPath.ok) return artifactPath;
  if (!safeRelativePath(artifactPath.value)) {
    return invalid('InvalidArtifactsPayload', 'artifactPath must be a safe relative path', '$.artifactPath');
  }
  return { ok: true, value: { repositoryPath: repositoryPath.value, artifactPath: artifactPath.value } };
};

export const createArtifactReadResponse = (value: unknown): FactoryResult<ArtifactReadResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidArtifactsPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['artifactPath', 'text', 'size', 'mtimeMs'], 'InvalidArtifactsPayload', '$');
  if (!keys.ok) return keys;
  const artifactPath = requireString(root.value.artifactPath, 'InvalidArtifactsPayload', '$.artifactPath');
  const text = requireString(root.value.text, 'InvalidArtifactsPayload', '$.text');
  const size = requireNumber(root.value.size, 'InvalidArtifactsPayload', '$.size');
  const mtimeMs = requireNumber(root.value.mtimeMs, 'InvalidArtifactsPayload', '$.mtimeMs');
  if (!artifactPath.ok) return artifactPath;
  if (!text.ok) return text;
  if (!size.ok) return size;
  if (!mtimeMs.ok) return mtimeMs;
  return { ok: true, value: { artifactPath: artifactPath.value, text: text.value, size: size.value, mtimeMs: mtimeMs.value } };
};
