import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { worktreePath, worktreesHome } from './worktreePaths';

const clonePosix = path.posix.join('/Users', 'dev', 'Documents', 'Concierge', 'psingley', 'workcells');

describe('worktreesHome / worktreePath', () => {
  it('groups worktrees in a SIBLING dir <clone>.worktrees, not a child of the clone', () => {
    const home = worktreesHome(clonePosix, path.posix);
    expect(home).toBe(path.posix.join(path.posix.dirname(clonePosix), 'workcells.worktrees'));
    // Must be a sibling: the clone path is NOT a prefix-segment ancestor of home.
    expect(home.startsWith(`${clonePosix}/`)).toBe(false);
  });

  it('builds the per-session worktree path under <clone>.worktrees/<sessionId>', () => {
    expect(worktreePath(clonePosix, 'session-abc', path.posix)).toBe(
      path.posix.join(path.posix.dirname(clonePosix), 'workcells.worktrees', 'session-abc')
    );
  });

  it('produces a win32-shaped sibling path on a win32 root (no POSIX-slug concatenation)', () => {
    const winClone = 'C:\\Users\\dev\\Documents\\Concierge\\psingley\\workcells';
    const home = worktreesHome(winClone, path.win32);
    expect(home).toBe(path.win32.join(path.win32.dirname(winClone), 'workcells.worktrees'));
    const target = worktreePath(winClone, 'session-abc', path.win32);
    expect(target).toBe(path.win32.join(home, 'session-abc'));
    expect(target.split(path.win32.sep)).toContain('workcells.worktrees');
  });
});
