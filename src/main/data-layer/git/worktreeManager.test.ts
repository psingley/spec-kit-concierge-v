import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createWorktree, resolveWorktree } from './worktreeManager';
import { worktreePath } from './worktreePaths';

const clonePath = path.join('/Users', 'dev', 'Documents', 'Concierge', 'psingley', 'workcells');

describe('createWorktree', () => {
  it('fetches origin then adds a DETACHED sibling worktree on origin/<default> when origin exists', async () => {
    const runGit = vi.fn(async (_cwd: string, args: string[]) => (args[0] === 'remote' ? 'origin\n' : ''));

    const result = await createWorktree(clonePath, 'session-1', 'main', { runGit });

    const expectedPath = worktreePath(clonePath, 'session-1');
    // No branch is pre-named — spec-kit names the real branch later. Detached HEAD.
    expect(result).toEqual({ sessionId: 'session-1', worktreePath: expectedPath, branch: null });
    expect(runGit).toHaveBeenCalledWith(clonePath, ['fetch', 'origin', '--prune']);
    expect(runGit).toHaveBeenCalledWith(clonePath, [
      'worktree',
      'add',
      '--detach',
      expectedPath,
      'origin/main'
    ]);
  });

  it('falls back to the local default branch (no fetch) when origin is absent', async () => {
    const runGit = vi.fn(async (_cwd: string, args: string[]) => (args[0] === 'remote' ? '' : ''));

    const result = await createWorktree(clonePath, 'session-2', 'main', { runGit });

    const expectedPath = worktreePath(clonePath, 'session-2');
    expect(result.worktreePath).toBe(expectedPath);
    expect(result.branch).toBeNull();
    expect(runGit).not.toHaveBeenCalledWith(clonePath, ['fetch', 'origin', '--prune']);
    expect(runGit).toHaveBeenCalledWith(clonePath, ['worktree', 'add', '--detach', expectedPath, 'main']);
  });

  it('targets a SIBLING path (not a child) of the clone', async () => {
    const runGit = vi.fn(async (_cwd: string, args: string[]) => (args[0] === 'remote' ? '' : ''));
    const result = await createWorktree(clonePath, 'session-3', 'main', { runGit });
    expect(result.worktreePath.startsWith(`${clonePath}${path.sep}`)).toBe(false);
    expect(result.worktreePath).toBe(path.join(path.dirname(clonePath), 'workcells.worktrees', 'session-3'));
  });
});

describe('resolveWorktree', () => {
  it('returns the worktree path when it exists on disk', async () => {
    const pathExists = vi.fn(async () => true);
    const resolved = await resolveWorktree(clonePath, 'session-1', { pathExists });
    expect(resolved).toBe(worktreePath(clonePath, 'session-1'));
  });

  it('returns undefined when the worktree directory is absent', async () => {
    const pathExists = vi.fn(async () => false);
    expect(await resolveWorktree(clonePath, 'session-1', { pathExists })).toBeUndefined();
  });
});
