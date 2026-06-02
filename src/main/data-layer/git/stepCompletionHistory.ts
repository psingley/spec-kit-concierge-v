import { parseConciergeStepTrailer } from './trailers';
import { isStepName, type StepName } from '../../hooks/manifest';

export type StepCompletionHistoryRecord = {
  commitSha: string;
  step: StepName;
  status: string;
  artifactSnapshotHash: string;
  warnings: string[];
};

export type MatchingStepCompletion = StepCompletionHistoryRecord & {
  adoptedFromHistory: true;
};

export type FindMatchingStepCompletionRequest = {
  step: StepName;
  status: 'pass';
  artifactSnapshotHash: string;
  runGit: (repositoryPath: string, args: string[]) => Promise<string>;
};

const artifactSnapshotPattern = /^\s*Artifact-Snapshot\s*:\s*([a-f0-9]{64})\s*$/im;

const parseFixtureStyleHistory = (historyText: string): StepCompletionHistoryRecord[] =>
  historyText
    .split(/\n(?=commit\s+[a-f0-9]{40}\b)/i)
    .flatMap((entry) => {
      const sha = /^commit\s+([a-f0-9]{40})/im.exec(entry)?.[1];
      if (sha === undefined) return [];
      return parseHistoryEntry(sha, entry);
    });

const parseGitLogHistory = (historyText: string): StepCompletionHistoryRecord[] =>
  historyText
    .split('\x1e')
    .flatMap((entry) => {
      const [sha, message] = entry.trim().split('\x00');
      if (sha === undefined || message === undefined || sha.length === 0) return [];
      return parseHistoryEntry(sha, message);
    });

const parseHistoryEntry = (commitSha: string, message: string): StepCompletionHistoryRecord[] => {
  const stepTrailer = parseConciergeStepTrailer(message, { commitSha });
  const artifactSnapshotHash = artifactSnapshotPattern.exec(message)?.[1];

  if (!stepTrailer.found || !isStepName(stepTrailer.step) || artifactSnapshotHash === undefined) {
    return [];
  }

  return [{
    commitSha,
    step: stepTrailer.step,
    status: stepTrailer.status,
    artifactSnapshotHash,
    warnings: stepTrailer.warnings
  }];
};

export const parseStepCompletionHistory = (historyText: string): StepCompletionHistoryRecord[] =>
  historyText.includes('\x00')
    ? parseGitLogHistory(historyText)
    : parseFixtureStyleHistory(historyText);

const findInRecords = (
  records: StepCompletionHistoryRecord[],
  request: Omit<FindMatchingStepCompletionRequest, 'runGit'>
): MatchingStepCompletion | undefined => {
  const match = records.find((record) =>
    record.step === request.step &&
    record.status === request.status &&
    record.artifactSnapshotHash === request.artifactSnapshotHash
  );

  return match === undefined ? undefined : { ...match, adoptedFromHistory: true };
};

export function findMatchingStepCompletion(
  records: StepCompletionHistoryRecord[],
  request: Omit<FindMatchingStepCompletionRequest, 'runGit'>
): MatchingStepCompletion | undefined;
export function findMatchingStepCompletion(
  repositoryPath: string,
  request: FindMatchingStepCompletionRequest
): Promise<MatchingStepCompletion | undefined>;
export function findMatchingStepCompletion(
  recordsOrRepositoryPath: StepCompletionHistoryRecord[] | string,
  request: Omit<FindMatchingStepCompletionRequest, 'runGit'> | FindMatchingStepCompletionRequest
): MatchingStepCompletion | undefined | Promise<MatchingStepCompletion | undefined> {
  if (Array.isArray(recordsOrRepositoryPath)) {
    return findInRecords(recordsOrRepositoryPath, request);
  }

  if (!('runGit' in request)) {
    throw new Error('runGit is required when reading step completion history from a repository');
  }

  return request.runGit(recordsOrRepositoryPath, ['log', '--format=%H%x00%B%x1e'])
    .then((historyText) => findInRecords(parseStepCompletionHistory(historyText), request));
}
