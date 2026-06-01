import { runGit as runGitDefault } from './gitCommand';

export type ResetToCleanMainDeps = {
  runGit?: (repositoryPath: string, args: string[]) => Promise<string>;
};

export type ResetToCleanMainResult = {
  branch: string;
};

/**
 * Prepare a clean checkout of the default branch from origin and hand off to
 * spec-kit. spec-kit owns branch creation — the app must NOT pre-create a
 * `spec/draft-*` branch. This is the "Start a new session" terminus: a pristine
 * `main` matching `origin/main`, ready for spec-kit to branch from.
 */
const hasOriginRemote = async (
  runGit: (repositoryPath: string, args: string[]) => Promise<string>,
  repositoryPath: string
): Promise<boolean> => {
  const remotes = await runGit(repositoryPath, ['remote']);
  return remotes
    .split(/\r?\n/)
    .map((remote) => remote.trim())
    .includes('origin');
};

export const resetToCleanMain = async (
  repositoryPath: string,
  defaultBranch: string | undefined,
  deps: ResetToCleanMainDeps = {}
): Promise<ResetToCleanMainResult> => {
  const runGit = deps.runGit ?? runGitDefault;
  const branch = defaultBranch !== undefined && defaultBranch.length > 0 ? defaultBranch : 'main';

  // A freshly cloned repo always has an `origin`; a local-only checkout legitimately
  // may not. Only reset to origin when it exists — otherwise honestly clean the
  // existing local default branch. spec-kit creates its OWN branch from here either way.
  if (await hasOriginRemote(runGit, repositoryPath)) {
    await runGit(repositoryPath, ['fetch', 'origin', '--prune']);
    await runGit(repositoryPath, ['checkout', branch]);
    await runGit(repositoryPath, ['reset', '--hard', `origin/${branch}`]);
  } else {
    await runGit(repositoryPath, ['checkout', branch]);
  }
  await runGit(repositoryPath, ['clean', '-fd']);

  return { branch };
};
