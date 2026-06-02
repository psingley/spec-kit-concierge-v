import type { ReadOnlyDoctorTool, StepName } from '../../domain/manifest/types';

export type ReadOnlyDoctorToolResult = {
  tool: ReadOnlyDoctorTool;
  bounded: true;
  payload: unknown;
};

export type ExecuteReadOnlyDoctorToolRequest = {
  tool: ReadOnlyDoctorTool;
  repositoryPath: string;
  step: StepName;
  arguments: Record<string, unknown>;
  maxStringLength?: number;
  readFeatureJson: (request: { repositoryPath: string; arguments: Record<string, unknown> }) => Promise<unknown>;
  readManifest: (request: { repositoryPath: string; arguments: Record<string, unknown> }) => Promise<unknown>;
  gitStatusDiff: (request: { repositoryPath: string; arguments: Record<string, unknown> }) => Promise<unknown>;
  readTrailers: (request: { repositoryPath: string; arguments: Record<string, unknown> }) => Promise<unknown>;
  readArtifacts: (request: { repositoryPath: string; step: StepName; arguments: Record<string, unknown> }) => Promise<unknown>;
  readTranscript: (request: { repositoryPath: string; step: StepName; arguments: Record<string, unknown> }) => Promise<unknown>;
};

const secretPattern = /\b(token|secret|authorization)=\S+/gi;

const boundString = (value: string, maxStringLength: number): string => {
  const redacted = value.replace(secretPattern, '$1=[REDACTED]');
  return redacted.length <= maxStringLength
    ? redacted
    : `${redacted.slice(0, maxStringLength)}...[TRUNCATED ${redacted.length - maxStringLength} chars]`;
};

const sanitize = (value: unknown, maxStringLength: number, key?: string): unknown => {
  if (key === 'rawContent') return undefined;
  if (typeof value === 'string') return boundString(value, maxStringLength);
  if (Array.isArray(value)) return value.map((item) => sanitize(item, maxStringLength));
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([entryKey, entryValue]) => [entryKey, sanitize(entryValue, maxStringLength, entryKey)])
        .filter(([, entryValue]) => entryValue !== undefined)
    );
  }
  return value;
};

export const executeReadOnlyDoctorTool = async (
  request: ExecuteReadOnlyDoctorToolRequest
): Promise<ReadOnlyDoctorToolResult> => {
  const base = { repositoryPath: request.repositoryPath, arguments: request.arguments };
  const payload = request.tool === 'readFeatureJson'
    ? await request.readFeatureJson(base)
    : request.tool === 'readManifest'
      ? await request.readManifest(base)
      : request.tool === 'gitStatusDiff'
        ? await request.gitStatusDiff(base)
        : request.tool === 'readTrailers'
          ? await request.readTrailers(base)
          : request.tool === 'readArtifacts'
            ? await request.readArtifacts({ ...base, step: request.step })
            : await request.readTranscript({ ...base, step: request.step });

  return {
    tool: request.tool,
    bounded: true,
    payload: sanitize(payload, request.maxStringLength ?? 4_000)
  };
};
