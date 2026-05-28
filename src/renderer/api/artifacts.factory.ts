import { requireExactKeys, requireNumber, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';

type ErrorName = 'InvalidArtifact';

export type RendererArtifact = { artifactPath: string; text: string; size: number; mtimeMs: number };

export const parseRendererArtifact = (
  value: unknown
): RendererFactoryResult<RendererArtifact, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidArtifact', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['artifactPath', 'text', 'size', 'mtimeMs']);
  if (!keys.ok) return keys;
  const artifactPath = requireString(root.value.artifactPath, 'InvalidArtifact', '$.artifactPath');
  const text = requireString(root.value.text, 'InvalidArtifact', '$.text');
  const size = requireNumber(root.value.size, 'InvalidArtifact', '$.size');
  const mtimeMs = requireNumber(root.value.mtimeMs, 'InvalidArtifact', '$.mtimeMs');
  if (!artifactPath.ok) return artifactPath;
  if (!text.ok) return text;
  if (!size.ok) return size;
  if (!mtimeMs.ok) return mtimeMs;
  return { ok: true, value: { artifactPath: artifactPath.value, text: text.value, size: size.value, mtimeMs: mtimeMs.value } };
};
