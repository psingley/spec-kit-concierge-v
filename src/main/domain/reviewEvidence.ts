import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { readConciergeStepHistory, runGit, type ConciergeStepHistoryRecord } from '../data-layer/git/gitCommand';
import { STEP_ARTIFACT_MANIFEST, type StepName } from '../hooks/manifest';
import { featureKeyFromDir, type AnalyzeReportExtractionStatus } from './evidence/analyzeReport';

export type ReviewEvidenceArtifact = {
  path: string;
  kind: 'text' | 'markdown' | 'code' | 'image' | 'pdf';
  step: StepName | 'analyze-report';
  commitSha: string;
  required: boolean;
};

export type ReviewClarification = {
  session: string;
  question: string;
  answer: string;
};

export type ReviewAnalyzeReport = {
  path: string;
  analyzeCommitSha: string;
  extractionStatus: AnalyzeReportExtractionStatus;
} | null;

export type ReviewEvidenceSummary = {
  featureDir: string;
  steps: Array<{ step: StepName; status: string; commitSha: string; warnings: string[] }>;
  artifacts: ReviewEvidenceArtifact[];
  clarifications: ReviewClarification[];
  analyzeReport: ReviewAnalyzeReport;
};

export type ReviewEvidenceBody = {
  artifactPath: string;
  text: string;
  size: number;
  mtimeMs: number;
};

export type ReviewEvidenceDeps = {
  readHistory?: (repositoryPath: string) => Promise<ConciergeStepHistoryRecord[]>;
  git?: (repositoryPath: string, args: string[]) => Promise<string>;
  readFile?: (filePath: string, encoding: BufferEncoding) => Promise<string>;
  stat?: (filePath: string) => Promise<{ size: number; mtimeMs: number }>;
};

const kindForArtifact = (artifactPath: string): ReviewEvidenceArtifact['kind'] => {
  if (artifactPath.endsWith('.md')) return 'markdown';
  if (/\.(ts|tsx|js|jsx|json|yml|yaml)$/i.test(artifactPath)) return 'code';
  if (/\.(png|jpg|jpeg|gif|webp)$/i.test(artifactPath)) return 'image';
  if (artifactPath.endsWith('.pdf')) return 'pdf';
  return 'text';
};

const safeRelativeFeatureDir = (repositoryPath: string, featureDir: string): string =>
  path.relative(repositoryPath, featureDir).split(path.sep).join('/');

const artifactExistsAtCommit = async (
  repositoryPath: string,
  commitSha: string,
  repoRelativePath: string,
  git: (repositoryPath: string, args: string[]) => Promise<string>
): Promise<boolean> => {
  try {
    await git(repositoryPath, ['cat-file', '-e', `${commitSha}:${repoRelativePath}`]);
    return true;
  } catch {
    return false;
  }
};

const discoverPlanOptionalAtCommit = async (
  repositoryPath: string,
  featureDir: string,
  commitSha: string,
  git: (repositoryPath: string, args: string[]) => Promise<string>
): Promise<string[]> => {
  const relativeFeatureDir = safeRelativeFeatureDir(repositoryPath, featureDir);
  const optional = STEP_ARTIFACT_MANIFEST.plan.optionalFiles;
  const direct = [];
  for (const artifact of optional.filter((candidate) => !candidate.endsWith('/'))) {
    if (await artifactExistsAtCommit(repositoryPath, commitSha, `${relativeFeatureDir}/${artifact}`, git)) {
      direct.push(artifact);
    }
  }

  let contractFiles: string[] = [];
  try {
    const output = await git(repositoryPath, ['ls-tree', '-r', '--name-only', commitSha, `${relativeFeatureDir}/contracts`]);
    contractFiles = output
      .split(/\r?\n/)
      .filter(Boolean)
      .map((file) => file.slice(`${relativeFeatureDir}/`.length))
      .filter((file) => file.startsWith('contracts/'));
  } catch {
    contractFiles = [];
  }

  return [...direct, ...contractFiles].sort();
};

const discoverManifestOptionalAtCommit = async (
  repositoryPath: string,
  featureDir: string,
  commitSha: string,
  step: StepName,
  git: (repositoryPath: string, args: string[]) => Promise<string>
): Promise<string[]> => {
  if (step === 'plan') {
    return discoverPlanOptionalAtCommit(repositoryPath, featureDir, commitSha, git);
  }
  const relativeFeatureDir = safeRelativeFeatureDir(repositoryPath, featureDir);
  const discovered: string[] = [];
  for (const artifact of STEP_ARTIFACT_MANIFEST[step].optionalFiles.filter((candidate) => !candidate.endsWith('/'))) {
    if (await artifactExistsAtCommit(repositoryPath, commitSha, `${relativeFeatureDir}/${artifact}`, git)) {
      discovered.push(artifact);
    }
  }
  return discovered;
};

export const parseClarifications = (specMarkdown: string): ReviewClarification[] => {
  const clarifications = /## Clarifications\s+([\s\S]*?)(?=\n## (?!#)|\s*$)/.exec(specMarkdown)?.[1];
  if (clarifications === undefined) {
    return [];
  }

  const results: ReviewClarification[] = [];
  const sessionPattern = /### Session\s+([^\n]+)\n([\s\S]*?)(?=\n### Session|\s*$)/g;
  for (const sessionMatch of clarifications.matchAll(sessionPattern)) {
    const session = (sessionMatch[1] ?? '').trim();
    const body = sessionMatch[2] ?? '';
    const questionPattern = /-\s+Q:\s*(.*?)\n\s+-\s+A:\s*(.*?)(?=\n-\s+Q:|\s*$)/gs;
    for (const match of body.matchAll(questionPattern)) {
      results.push({
        session,
        question: (match[1] ?? '').trim(),
        answer: (match[2] ?? '').trim()
      });
    }
  }

  return results;
};

const readCommittedSpec = async (
  repositoryPath: string,
  featureDir: string,
  commitSha: string,
  git: (repositoryPath: string, args: string[]) => Promise<string>
): Promise<string> => {
  const relativeFeatureDir = safeRelativeFeatureDir(repositoryPath, featureDir);
  return git(repositoryPath, ['show', `${commitSha}:${relativeFeatureDir}/spec.md`]);
};

const readAnalyzeReportIndex = async (
  userDataPath: string,
  featureDir: string,
  analyzeCommitSha: string,
  fileReader: (filePath: string, encoding: BufferEncoding) => Promise<string>
): Promise<ReviewAnalyzeReport> => {
  const indexPath = path.join(userDataPath, 'evidence', featureKeyFromDir(featureDir), 'analyze-report-index.json');
  try {
    const parsed = JSON.parse(await fileReader(indexPath, 'utf8')) as unknown;
    const entries = Array.isArray(parsed) ? parsed : [];
    const match = entries.find((entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      (entry as { analyzeCommitSha?: unknown }).analyzeCommitSha === analyzeCommitSha
    ) as { reportPath?: unknown; extractionStatus?: unknown } | undefined;
    if (typeof match?.reportPath !== 'string') {
      return null;
    }
    const extractionStatus = match.extractionStatus === 'missing' || match.extractionStatus === 'ambiguous'
      ? match.extractionStatus
      : 'captured';
    return { path: match.reportPath, analyzeCommitSha, extractionStatus };
  } catch {
    return null;
  }
};

export const buildReviewEvidence = async (
  request: { repositoryPath: string; featureDir: string; userDataPath: string },
  deps: ReviewEvidenceDeps = {}
): Promise<ReviewEvidenceSummary> => {
  const readHistory = deps.readHistory ?? readConciergeStepHistory;
  const git = deps.git ?? runGit;
  const fileReader = deps.readFile ?? readFile;
  const history = await readHistory(request.repositoryPath);
  const passed = history.filter((record) => record.status === 'pass' && record.step !== 'review');
  const latestByStep = new Map<StepName, ConciergeStepHistoryRecord>();
  for (const record of passed) {
    if (!latestByStep.has(record.step)) {
      latestByStep.set(record.step, record);
    }
  }

  const artifacts: ReviewEvidenceArtifact[] = [];
  for (const record of latestByStep.values()) {
    const required = record.step === 'analyze'
      ? []
      : [...STEP_ARTIFACT_MANIFEST[record.step].requiredFiles];
    const optional = await discoverManifestOptionalAtCommit(request.repositoryPath, request.featureDir, record.commitSha, record.step, git);
    for (const artifactPath of required) {
      artifacts.push({ path: artifactPath, kind: kindForArtifact(artifactPath), step: record.step, commitSha: record.commitSha, required: true });
    }
    for (const artifactPath of optional) {
      artifacts.push({ path: artifactPath, kind: kindForArtifact(artifactPath), step: record.step, commitSha: record.commitSha, required: false });
    }
  }

  const specCommit = latestByStep.get('clarify') ?? latestByStep.get('specify');
  const clarifications = specCommit === undefined
    ? []
    : parseClarifications(await readCommittedSpec(request.repositoryPath, request.featureDir, specCommit.commitSha, git));
  const analyzeCommit = latestByStep.get('analyze')?.commitSha;
  const analyzeReport = analyzeCommit === undefined
    ? null
    : await readAnalyzeReportIndex(request.userDataPath, request.featureDir, analyzeCommit, fileReader);

  if (analyzeReport !== null) {
    artifacts.push({
      path: analyzeReport.path,
      kind: 'markdown',
      step: 'analyze-report',
      commitSha: analyzeReport.analyzeCommitSha,
      required: false
    });
  }

  return {
    featureDir: request.featureDir,
    steps: Array.from(latestByStep.values()).map((record) => ({
      step: record.step,
      status: record.status,
      commitSha: record.commitSha,
      warnings: record.warnings
    })),
    artifacts,
    clarifications,
    analyzeReport
  };
};

const safeRelativeArtifactPath = (value: string): boolean =>
  value.length > 0 && !value.startsWith('/') && !value.includes('..') && !value.includes('\\') && !value.includes('\0');

const assertWithin = (root: string, candidate: string): void => {
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Evidence path is outside the allowed evidence roots.');
  }
};

export const readReviewEvidenceBody = async (
  request: { repositoryPath: string; featureDir: string; userDataPath: string; artifactPath: string },
  deps: Pick<ReviewEvidenceDeps, 'readFile' | 'stat'> = {}
): Promise<ReviewEvidenceBody> => {
  const fileReader = deps.readFile ?? readFile;
  const statReader = deps.stat ?? stat;
  const appEvidenceRoot = path.join(request.userDataPath, 'evidence', featureKeyFromDir(request.featureDir));
  const absolutePath = path.isAbsolute(request.artifactPath)
    ? request.artifactPath
    : path.join(request.featureDir, request.artifactPath);

  if (path.isAbsolute(request.artifactPath)) {
    if (request.artifactPath.includes('\0')) {
      throw new Error('Evidence path is not safe.');
    }
    assertWithin(appEvidenceRoot, absolutePath);
  } else if (!safeRelativeArtifactPath(request.artifactPath)) {
    throw new Error('Evidence path is not safe.');
  } else {
    assertWithin(request.featureDir, absolutePath);
  }

  const metadata = await statReader(absolutePath);
  if (metadata.size > 512 * 1024) {
    throw new Error('Evidence body is too large to read.');
  }
  return {
    artifactPath: request.artifactPath,
    text: await fileReader(absolutePath, 'utf8'),
    size: metadata.size,
    mtimeMs: metadata.mtimeMs
  };
};
