import path from 'node:path';

/**
 * Per-clone home for app-managed session worktrees (ADR-0016). Worktrees are
 * SIBLINGS of the clone, NOT children of it: a child `.worktrees/` would pollute
 * the repo tree (spec-kit's specs/ globbing + file watchers would see into
 * sibling sessions, and an `rm -rf <clone>` would nuke every session). Instead
 * we group them next to the clone in `<clone>.worktrees/`.
 *
 * e.g. clone `~/Documents/Concierge/psingley/repo/` →
 *      worktrees in `~/Documents/Concierge/psingley/repo.worktrees/<sessionId>/`.
 *
 * Built ENTIRELY with path.join/dirname/basename so the same code yields a
 * correct location on macOS AND Windows (the `platformPath` seam exists only so
 * tests can assert the win32 shape).
 */
export const worktreesHome = (
  clonePath: string,
  platformPath: Pick<typeof path, 'join' | 'dirname' | 'basename'> = path
): string => platformPath.join(platformPath.dirname(clonePath), `${platformPath.basename(clonePath)}.worktrees`);

/**
 * The isolated working directory for a single session, keyed by sessionId:
 * `<clone>.worktrees/<sessionId>/`. sessionId must already be filesystem-safe.
 */
export const worktreePath = (
  clonePath: string,
  sessionId: string,
  platformPath: Pick<typeof path, 'join' | 'dirname' | 'basename'> = path
): string => platformPath.join(worktreesHome(clonePath, platformPath), sessionId);
