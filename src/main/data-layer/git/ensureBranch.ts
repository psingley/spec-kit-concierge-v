import path from 'node:path';
import { GitCommandError, runGit } from './gitCommand';

const branchExists = (error: unknown): boolean =>
  error instanceof GitCommandError && /already exists/i.test(error.stderr);

/**
 * Guarantee the worktree at `repositoryPath` ends on a real (non-detached) branch.
 *
 * Bug 25: spec-kit's before_specify `git.feature` hook (`git checkout -b NNN-slug`)
 * is an LLM-executed mandatory hook the specify agent sometimes skips, leaving the
 * session worktree on a DETACHED HEAD. Downstream steps gate on a non-null branch,
 * so this is a post-specify reconciliation that names the branch Concierge expects.
 *
 * Behaviour:
 * - Already on a branch (detached HEAD returns empty from `branch --show-current`):
 *   - same as `branchName`        -> no-op, return it.
 *   - a DIFFERENT branch          -> leave it untouched (no force), return that branch.
 * - Detached HEAD                 -> `checkout -b <branchName>` at the current commit
 *   (no data moves). On collision (a same-named branch already exists in the clone,
 *   e.g. from a prior session), DO NOT clobber or switch onto it (it may be checked
 *   out in another worktree). Instead create a uniquely-suffixed branch derived from
 *   this worktree's session-unique directory name, so the step never fails or moves
 *   another worktree's branch. Returns the resulting branch name.
 */
export const ensureBranch = async (repositoryPath: string, branchName: string): Promise<string> => {
  const current = await runGit(repositoryPath, ['branch', '--show-current']);
  if (current.length > 0) {
    // On a real branch already — keep spec-kit's choice (or a prior reconciliation).
    return current;
  }

  // Detached HEAD: create + switch at the current commit.
  try {
    await runGit(repositoryPath, ['checkout', '-b', branchName]);
    return branchName;
  } catch (error) {
    if (!branchExists(error)) {
      throw error;
    }
  }

  // Collision: a branch named `branchName` already exists (possibly checked out in
  // another worktree). Derive a session-unique name from this worktree's directory
  // basename (the sessionId, ADR-0016) so we never clobber or fail.
  const suffix = path.basename(repositoryPath).slice(-8);
  const uniqueName = `${branchName}-${suffix}`;
  await runGit(repositoryPath, ['checkout', '-b', uniqueName]);
  return uniqueName;
};
