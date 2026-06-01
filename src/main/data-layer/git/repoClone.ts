import { execFile } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { resolveWindowsBinary } from '../auth/execGh';
import { runGit } from './gitCommand';

const execFileAsync = promisify(execFile);

/**
 * Resolve the local filesystem path for a managed clone.
 * Always `{userDataPath}/repos/{owner}/{name}`.
 */
export const resolveLocalRepoPath = (userDataPath: string, repositoryPath: string): string => {
  const parts = repositoryPath.split('/');
  if (
    parts.length !== 2 ||
    parts[0] === '' ||
    parts[1] === '' ||
    parts.some((part) => part === '.' || part === '..' || part.includes('..') || part.includes('\\'))
  ) {
    throw new Error(`Invalid repositoryPath: "${repositoryPath}". Expected "owner/name".`);
  }
  const [owner, name] = parts as [string, string];
  return path.join(userDataPath, 'repos', owner, name);
};

/**
 * Returns true if the path contains a git repository.
 */
const isGitRepo = async (localPath: string): Promise<boolean> => {
  try {
    await access(path.join(localPath, '.git'));
    return true;
  } catch {
    return false;
  }
};

export type EnsureCloneOptions = {
  userDataPath: string;
  repositoryPath: string;
  defaultBranch?: string;
};

/**
 * Ensure the repository is cloned locally. If already present, fetch latest.
 * Uses `gh repo clone` for cloning (inherits gh auth) and `git fetch` for updates.
 * Returns the absolute local path.
 */
export const ensureClone = async ({
  userDataPath,
  repositoryPath,
  defaultBranch = 'main'
}: EnsureCloneOptions): Promise<string> => {
  // Absolute paths are pre-existing local repos (e.g. test fixtures) — use directly.
  if (path.isAbsolute(repositoryPath)) {
    return repositoryPath;
  }

  const localPath = resolveLocalRepoPath(userDataPath, repositoryPath);
  const parentDir = path.dirname(localPath);

  if (await isGitRepo(localPath)) {
    // Already cloned — fetch and reset to default branch
    await runGit(localPath, ['fetch', 'origin']);
    const currentBranch = (await runGit(localPath, ['branch', '--show-current'])).trim();
    if (currentBranch !== defaultBranch) {
      await runGit(localPath, ['checkout', defaultBranch]);
    }
    await runGit(localPath, ['reset', '--hard', `origin/${defaultBranch}`]);
    return localPath;
  }

  // Fresh shallow clone via gh CLI
  await mkdir(parentDir, { recursive: true });
  await execFileAsync(await resolveWindowsBinary('gh'), ['repo', 'clone', repositoryPath, localPath, '--', '--depth=1']);

  // Configure credential helper for pushes
  await runGit(localPath, ['config', 'credential.helper', '!gh auth git-credential']);

  return localPath;
};

/**
 * Push the current branch to origin.
 */
export const pushCurrentBranch = async (localPath: string): Promise<void> => {
  const branch = (await runGit(localPath, ['branch', '--show-current'])).trim();
  await runGit(localPath, ['push', '-u', 'origin', branch]);
};
