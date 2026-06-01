import { runGit as runGitDefault } from './gitCommand';

export type ResetToCleanMainDeps = {
  runGit?: (repositoryPath: string, args: string[]) => Promise<string>;
};

export type ResetToCleanMainResult = {
  branch: string;
  /** HEAD sha before the catch-up reset. `null` on the local-only (no origin) path. */
  beforeSha: string | null;
  /** HEAD sha after the catch-up reset (equals `originSha` on success). `null` local-only. */
  afterSha: string | null;
  /** The `origin/<branch>` target sha we reset onto. `null` local-only. */
  originSha: string | null;
  /** Commits the local branch advanced by (`before..after`). `0` when already current or local-only. */
  commitsAdvanced: number;
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
    // Catch-up evidence (Principle XV): capture HEAD before, the origin target after
    // fetch, then HEAD after reset so the log can prove "advanced N commits" vs.
    // "already up to date" instead of a blind success line.
    await runGit(repositoryPath, ['fetch', 'origin', '--prune']);
    const beforeSha = (await runGit(repositoryPath, ['rev-parse', 'HEAD'])).trim();
    const originSha = (await runGit(repositoryPath, ['rev-parse', `origin/${branch}`])).trim();
    await runGit(repositoryPath, ['checkout', branch]);
    await runGit(repositoryPath, ['reset', '--hard', `origin/${branch}`]);
    const afterSha = (await runGit(repositoryPath, ['rev-parse', 'HEAD'])).trim();
    const advancedRaw = (await runGit(repositoryPath, ['rev-list', '--count', `${beforeSha}..${afterSha}`])).trim();
    const parsed = Number.parseInt(advancedRaw, 10);
    const commitsAdvanced = Number.isFinite(parsed) ? parsed : 0;
    await runGit(repositoryPath, ['clean', '-fd']);

    return { branch, beforeSha, afterSha, originSha, commitsAdvanced };
  }

  // Local-only, no origin: nothing to catch up to. Report honestly rather than
  // faking sha movement.
  await runGit(repositoryPath, ['checkout', branch]);
  await runGit(repositoryPath, ['clean', '-fd']);

  return { branch, beforeSha: null, afterSha: null, originSha: null, commitsAdvanced: 0 };
};
