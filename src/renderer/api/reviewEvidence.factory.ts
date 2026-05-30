import { invalid, requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';

type ErrorName = 'InvalidReviewEvidence';

export type ReviewEvidenceArtifact = {
  path: string;
  kind: 'text' | 'markdown' | 'code' | 'image' | 'pdf';
  step: string;
  commitSha: string;
  required: boolean;
};

export type ReviewClarification = {
  session: string;
  question: string;
  answer: string;
};

export type ReviewEvidence = {
  featureDir: string;
  steps: Array<{ step: string; status: string; commitSha: string; warnings: string[] }>;
  artifacts: ReviewEvidenceArtifact[];
  clarifications: ReviewClarification[];
  analyzeReport: { path: string; analyzeCommitSha: string; extractionStatus: string } | null;
};

export type ReviewEvidenceBody = {
  artifactPath: string;
  text: string;
  size: number;
  mtimeMs: number;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const parseArtifact = (value: unknown, itemPath: string): RendererFactoryResult<ReviewEvidenceArtifact, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidReviewEvidence', itemPath);
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['path', 'kind', 'step', 'commitSha', 'required']);
  if (!keys.ok) return keys;
  const artifactPath = requireString(root.value.path, 'InvalidReviewEvidence', `${itemPath}.path`);
  const kind = requireString(root.value.kind, 'InvalidReviewEvidence', `${itemPath}.kind`);
  const step = requireString(root.value.step, 'InvalidReviewEvidence', `${itemPath}.step`);
  const commitSha = requireString(root.value.commitSha, 'InvalidReviewEvidence', `${itemPath}.commitSha`);
  if (!artifactPath.ok) return artifactPath;
  if (!kind.ok) return kind;
  if (!step.ok) return step;
  if (!commitSha.ok) return commitSha;
  if (typeof root.value.required !== 'boolean') {
    return invalid('InvalidReviewEvidence', 'must be boolean', `${itemPath}.required`);
  }
  return { ok: true, value: { path: artifactPath.value, kind: kind.value as ReviewEvidenceArtifact['kind'], step: step.value, commitSha: commitSha.value, required: root.value.required } };
};

export const parseRendererReviewEvidence = (
  value: unknown
): RendererFactoryResult<ReviewEvidence, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidReviewEvidence', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['featureDir', 'steps', 'artifacts', 'clarifications', 'analyzeReport']);
  if (!keys.ok) return keys;
  const featureDir = requireString(root.value.featureDir, 'InvalidReviewEvidence', '$.featureDir');
  if (!featureDir.ok) return featureDir;
  if (!Array.isArray(root.value.steps) || !Array.isArray(root.value.artifacts) || !Array.isArray(root.value.clarifications)) {
    return invalid('InvalidReviewEvidence', 'steps, artifacts, and clarifications must be arrays', '$');
  }
  const artifacts: ReviewEvidenceArtifact[] = [];
  for (const [index, artifact] of root.value.artifacts.entries()) {
    const parsed = parseArtifact(artifact, `$.artifacts[${index}]`);
    if (!parsed.ok) return parsed;
    artifacts.push(parsed.value);
  }
  return {
    ok: true,
    value: {
      featureDir: featureDir.value,
      steps: root.value.steps.filter((step): step is ReviewEvidence['steps'][number] => {
        const record = requireRecord(step, 'InvalidReviewEvidence', '$.steps[]');
        return record.ok && typeof record.value.step === 'string' && typeof record.value.status === 'string' && typeof record.value.commitSha === 'string' && isStringArray(record.value.warnings);
      }),
      artifacts,
      clarifications: root.value.clarifications.filter((item): item is ReviewClarification => {
        const record = requireRecord(item, 'InvalidReviewEvidence', '$.clarifications[]');
        return record.ok && typeof record.value.session === 'string' && typeof record.value.question === 'string' && typeof record.value.answer === 'string';
      }),
      analyzeReport: root.value.analyzeReport as ReviewEvidence['analyzeReport']
    }
  };
};

export const parseRendererReviewEvidenceBody = (
  value: unknown
): RendererFactoryResult<ReviewEvidenceBody, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidReviewEvidence', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['artifactPath', 'text', 'size', 'mtimeMs']);
  if (!keys.ok) return keys;
  const artifactPath = requireString(root.value.artifactPath, 'InvalidReviewEvidence', '$.artifactPath');
  const text = requireString(root.value.text, 'InvalidReviewEvidence', '$.text');
  if (!artifactPath.ok) return artifactPath;
  if (!text.ok) return text;
  if (typeof root.value.size !== 'number' || typeof root.value.mtimeMs !== 'number') {
    return invalid('InvalidReviewEvidence', 'size and mtimeMs must be numbers', '$');
  }
  return { ok: true, value: { artifactPath: artifactPath.value, text: text.value, size: root.value.size, mtimeMs: root.value.mtimeMs } };
};
