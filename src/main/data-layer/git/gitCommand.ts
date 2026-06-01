import { execFile } from 'node:child_process';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { ConciergeStepCommit } from '../../domain/factories/types';
import { isStepName, type StepName } from '../../hooks/manifest';
import { resolveGitBinary } from './gitBinary';
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
};

const messageFilePath = async (repositoryPath: string): Promise<string> => {
  const gitDir = await runGit(repositoryPath, ['rev-parse', '--git-dir']);
  const resolvedGitDir = path.isAbsolute(gitDir) ? gitDir : path.join(repositoryPath, gitDir);
  await mkdir(resolvedGitDir, { recursive: true });

  return path.join(resolvedGitDir, 'CONCIERGE_STEP_MESSAGE');
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

  const filePath = await messageFilePath(repositoryPath);
  const trailer = `Concierge-Step: ${candidate.step}:${candidate.status}`;
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

  return { commitSha, trailer };
};

export type ConciergeStepHistoryRecord = {
  step: StepName;
  status: string;
  commitSha: string;
  warnings: string[];
};

export const readConciergeStepHistory = async (
  repositoryPath: string
): Promise<ConciergeStepHistoryRecord[]> => {
  const output = await runGit(repositoryPath, ['log', '--format=%H%x00%B%x1e']);
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
