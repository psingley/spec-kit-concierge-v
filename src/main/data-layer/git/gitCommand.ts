import { execFile } from 'node:child_process';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { ConciergeStepCommit } from '../../domain/factories/types';
import { isStepName, type StepName } from '../../hooks/manifest';
import { resolveGitBinary } from './gitBinary';
import { findMatchingStepCompletion } from './stepCompletionHistory';
import { parseConciergeStepTrailer } from './trailers';

const execFileAsync = promisify(execFile);

/**
 * Distinguish the two failure modes that both surface as `spawn ... ENOENT`:
 * a missing git binary (handled by resolveGitBinary) vs. a missing cwd. A repo
 * that was never cloned locally lands here with a clear, actionable message
 * instead of the misleading "git binary missing" ENOENT — on macOS AND Windows.
 */
const ensureCwdExists = async (repositoryPath: string): Promise<void> => {
  try {
    await access(repositoryPath);
  } catch {
    throw new Error(`repository not cloned locally at ${repositoryPath}`);
  }
};

export class GitCommandError extends Error {
  constructor(
    message: string,
    readonly command: string[],
    readonly cause: unknown,
    readonly stdout = '',
    readonly stderr = '',
    readonly status: number | null = null
  ) {
    super(message);
    this.name = 'GitCommandError';
  }
}

type ExecFailure = Error & {
  stdout?: string;
  stderr?: string;
  code?: number;
};

export const runGit = async (repositoryPath: string, args: string[]): Promise<string> => {
  await ensureCwdExists(repositoryPath);
  const gitBinary = await resolveGitBinary();
  try {
    const { stdout } = await execFileAsync(gitBinary, args, { cwd: repositoryPath });

    return stdout.trim();
  } catch (error) {
    const failure = error as ExecFailure;
    throw new GitCommandError(
      `git ${args.join(' ')} failed`,
      [gitBinary, ...args],
      error,
      failure.stdout ?? '',
      failure.stderr ?? '',
      typeof failure.code === 'number' ? failure.code : null
    );
  }
};

export type CommitWithTrailerResult = {
  commitSha: string;
  trailer: string;
  artifactSnapshotHash?: string;
  adoptedFromHistory?: boolean;
};

const messageFilePath = async (repositoryPath: string): Promise<string> => {
  const gitDir = await runGit(repositoryPath, ['rev-parse', '--git-dir']);
  const resolvedGitDir = path.isAbsolute(gitDir) ? gitDir : path.join(repositoryPath, gitDir);
  await mkdir(resolvedGitDir, { recursive: true });

  return path.join(resolvedGitDir, 'CONCIERGE_STEP_MESSAGE');
};

// `git diff --cached --quiet` exits 0 when nothing is staged and 1 when there
// are staged changes. runGit throws GitCommandError on any non-zero exit, so a
// clean resolve means "nothing staged" and a status-1 throw means "staged".
// Any other failure is a genuine git error and is re-thrown.
const hasStagedChanges = async (repositoryPath: string): Promise<boolean> => {
  try {
    await runGit(repositoryPath, ['diff', '--cached', '--quiet']);
    return false;
  } catch (error) {
    if (error instanceof GitCommandError && error.status === 1) {
      return true;
    }
    throw error;
  }
};

const headHasMatchingTrailer = async (
  repositoryPath: string,
  candidate: ConciergeStepCommit
): Promise<CommitWithTrailerResult | undefined> => {
  const trailer = `Concierge-Step: ${candidate.step}:${candidate.status}`;
  const headSha = await runGit(repositoryPath, ['rev-parse', 'HEAD']);
  const headMessage = await runGit(repositoryPath, ['log', '-1', '--format=%B']);
  const headTrailer = parseConciergeStepTrailer(headMessage, { commitSha: headSha });

  if (
    headTrailer.found &&
    headTrailer.step === candidate.step &&
    headTrailer.status === candidate.status &&
    candidate.artifactSnapshotHash === undefined
  ) {
    return { commitSha: headSha, trailer };
  }

  return undefined;
};

export const commitWithTrailer = async (
  repositoryPath: string,
  candidate: ConciergeStepCommit
): Promise<CommitWithTrailerResult> => {
  if (candidate.allowEmptyCommit === true && candidate.step !== 'analyze') {
    throw new GitCommandError('only analyze may request empty commits', ['git', 'commit'], undefined);
  }

  if (candidate.files.length > 0) {
    await runGit(repositoryPath, ['add', '--', ...candidate.files]);
  }

  const trailer = `Concierge-Step: ${candidate.step}:${candidate.status}`;

  // Idempotency: an agent (e.g. Copilot) may have already committed the
  // artifacts WITH the Concierge-Step trailer before this after-hook runs,
  // leaving nothing staged. The analyze allow-empty path legitimately commits
  // with nothing staged, so it must skip this short-circuit.
  if (candidate.allowEmptyCommit !== true && !(await hasStagedChanges(repositoryPath))) {
    if (candidate.artifactSnapshotHash !== undefined) {
      const matchingCompletion = await findMatchingStepCompletion(repositoryPath, {
        step: candidate.step,
        status: candidate.status,
        artifactSnapshotHash: candidate.artifactSnapshotHash,
        runGit
      });

      if (matchingCompletion !== undefined) {
        return {
          commitSha: matchingCompletion.commitSha,
          trailer,
          artifactSnapshotHash: matchingCompletion.artifactSnapshotHash,
          adoptedFromHistory: true
        };
      }
    } else {
      const headMatch = await headHasMatchingTrailer(repositoryPath, candidate);
      if (headMatch !== undefined) {
        return headMatch;
      }
    }

    throw new GitCommandError(
      `nothing to commit for step ${candidate.step} and HEAD has no matching Concierge-Step trailer`,
      ['git', 'commit'],
      undefined
    );
  }

  const filePath = await messageFilePath(repositoryPath);
  await writeFile(filePath, `${candidate.message}\n`, 'utf8');
  await runGit(repositoryPath, [
    'interpret-trailers',
    '--in-place',
    '--if-exists',
    'replace',
    '--trailer',
    trailer,
    filePath
  ]);
  if (candidate.artifactSnapshotHash !== undefined) {
    await runGit(repositoryPath, [
      'interpret-trailers',
      '--in-place',
      '--if-exists',
      'replace',
      '--trailer',
      `Artifact-Snapshot: ${candidate.artifactSnapshotHash}`,
      filePath
    ]);
  }

  const commitArgs = ['commit', '-F', filePath];
  if (candidate.allowEmptyCommit === true) {
    commitArgs.push('--allow-empty');
  }

  try {
    await runGit(repositoryPath, commitArgs);
  } finally {
    await unlink(filePath).catch(() => undefined);
  }

  const commitSha = await runGit(repositoryPath, ['rev-parse', 'HEAD']);

  return {
    commitSha,
    trailer,
    ...(candidate.artifactSnapshotHash === undefined ? {} : { artifactSnapshotHash: candidate.artifactSnapshotHash })
  };
};

export type ConciergeStepHistoryRecord = {
  step: StepName;
  status: string;
  commitSha: string;
  warnings: string[];
};

export const readConciergeStepHistory = async (
  repositoryPath: string,
  revisionRange?: string
): Promise<ConciergeStepHistoryRecord[]> => {
  const logArgs = ['log', '--format=%H%x00%B%x1e'];
  if (revisionRange !== undefined && revisionRange.length > 0) {
    logArgs.push(revisionRange);
  }
  const output = await runGit(repositoryPath, logArgs);
  return output
    .split('\x1e')
    .map((entry) => entry.trim())
    .flatMap((entry) => {
      const [sha, message] = entry.split('\x00');
      if (sha === undefined || message === undefined) {
        return [];
      }
      const trailer = parseConciergeStepTrailer(message, { commitSha: sha });
      if (!trailer.found || !isStepName(trailer.step)) {
        return [];
      }
      return [{ step: trailer.step, status: trailer.status, commitSha: sha, warnings: trailer.warnings }];
    });
};

export const restoreManifestPaths = async (repositoryPath: string, paths: string[]): Promise<void> => {
  if (paths.length === 0) {
    return;
  }
  await runGit(repositoryPath, ['checkout', '--', ...paths]);
};
