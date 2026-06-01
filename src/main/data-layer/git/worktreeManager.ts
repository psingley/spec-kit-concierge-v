import { access } from 'node:fs/promises';
import { runGit as runGitDefault } from './gitCommand';
import { worktreePath } from './worktreePaths';

export type WorktreeManagerDeps = {
  // cwd-parametric, worktree-safe git runner (defaults to the real runGit).
  runGit?: (cwd: string, args: string[]) => Promise<string>;
  // Existence probe, injected so resolveWorktree stays hermetic in tests.
  pathExists?: (target: string) => Promise<boolean>;
};

export type CreateWorktreeResult = {
  sessionId: string;
  worktreePath: string;
  // null until spec-kit's before_specify hook names the real branch — the
  // worktree starts on a DETACHED HEAD with no pre-named branch (ADR-0016).
  branch: string | null;
};

const defaultPathExists = async (target: string): Promise<boolean> => {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};

// Does the clone have an `origin` remote? Determines whether we fetch + branch
// from `origin/<default>` (the up-to-date upstream tip) or the local default.
const hasOrigin = async (
  clonePath: string,
  runGit: (cwd: string, args: string[]) => Promise<string>
): Promise<boolean> => {
  try {
    const remotes = await runGit(clonePath, ['remote']);
    return remotes
      .split('\n')
      .map((line) => line.trim())
      .includes('origin');
  } catch {
    return false;
  }
};

/**
 * Create an isolated git worktree for a session on a DETACHED HEAD (ADR-0016).
 * The worktree is a SIBLING of the clone (see worktreePath) sharing the clone's
 * object store, so this is cheap (no re-clone) and cannot pollute the clone's
 * git status. When an `origin` remote exists the base is the freshly fetched
 * `origin/<default>` tip; otherwise the local `<default>`.
 *
 * Crucially the worktree is created WITHOUT a pre-named branch (`--detach`):
 * spec-kit's own before_specify hook creates the real, feature-steered branch
 * (NNN-slug) from the detached HEAD when specify runs. The branch is therefore
 * unknown at creation time and returned as `null` — callers read the worktree's
 * actual branch only after spec-kit has named it.
 */
export const createWorktree = async (
  clonePath: string,
  sessionId: string,
  defaultBranch: string,
  deps: WorktreeManagerDeps = {}
): Promise<CreateWorktreeResult> => {
  const runGit = deps.runGit ?? runGitDefault;

  const target = worktreePath(clonePath, sessionId);
  const originPresent = await hasOrigin(clonePath, runGit);
  if (originPresent) {
    await runGit(clonePath, ['fetch', 'origin', '--prune']);
  }
  const base = originPresent ? `origin/${defaultBranch}` : defaultBranch;

  await runGit(clonePath, ['worktree', 'add', '--detach', target, base]);

  return { sessionId, worktreePath: target, branch: null };
};

/**
 * Resolve the on-disk worktree path for a session, or undefined when it does
 * not exist. Pure path.join + existence check — no git invocation.
 */
export const resolveWorktree = async (
  clonePath: string,
  sessionId: string,
  deps: Pick<WorktreeManagerDeps, 'pathExists'> = {}
): Promise<string | undefined> => {
  const pathExists = deps.pathExists ?? defaultPathExists;
  const target = worktreePath(clonePath, sessionId);
  return (await pathExists(target)) ? target : undefined;
};

// TODO(Phase 2/3): listWorktrees(clonePath): Promise<{sessionId, worktreePath, branch}[]>
// TODO(Phase 2/3): removeWorktree(clonePath, sessionId): Promise<void>
