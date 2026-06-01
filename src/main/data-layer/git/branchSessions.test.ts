import { describe, expect, it, vi } from 'vitest';
import { listBranchSessions, type BranchSessionsDeps } from './branchSessions';
import type { ConciergeStepHistoryRecord } from './gitCommand';

const CLONE = '/Users/dev/Documents/Concierge/psingley/repo';
const HOME = '/Users/dev/Documents/Concierge/psingley/repo.worktrees';

// A `git worktree list --porcelain` fixture: the clone's own worktree (on main)
// plus session worktrees under `<clone>.worktrees/`.
const porcelain = (
  ...worktrees: { path: string; branch?: string; detached?: boolean }[]
): string =>
  worktrees
    .map((wt) => {
      const lines = [`worktree ${wt.path}`, 'HEAD 0123456789abcdef0123456789abcdef01234567'];
      lines.push(wt.detached === true ? 'detached' : `branch refs/heads/${wt.branch}`);
      return lines.join('\n');
    })
    .join('\n\n');

// Records the cwd + args of every git invocation so tests can assert NO checkout.
type Call = { cwd: string; args: string[] };

// A POSIX-style path seam so the worktree-home math is deterministic regardless of
// the host OS the test runs on.
const platformPath = {
  join: (...parts: string[]): string => parts.join('/'),
  dirname: (p: string): string => p.slice(0, p.lastIndexOf('/')),
  basename: (p: string): string => p.slice(p.lastIndexOf('/') + 1)
};

const makeDeps = (
  porcelainOut: string,
  historyByCwd: Record<string, ConciergeStepHistoryRecord[]>,
  statusByCwd: Record<string, string> = {}
): { deps: BranchSessionsDeps; calls: Call[] } => {
  const calls: Call[] = [];
  const runGit = vi.fn(async (cwd: string, args: string[]): Promise<string> => {
    calls.push({ cwd, args });
    if (args[0] === 'worktree' && args[1] === 'list') {
      return porcelainOut;
    }
    if (args[0] === 'branch' && args[1] === '--format=%(refname:short)') {
      // The clone has main locally — used as the comparison base.
      return 'main\n014-remove-faux-controls\nspec/draft-legacy';
    }
    if (args[0] === 'diff') {
      // No committed-unique spec.md by default; specMd presence comes via status.
      return '';
    }
    if (args[0] === 'status') {
      return statusByCwd[cwd] ?? '';
    }
    return '';
  });
  const readHistory = vi.fn(async (cwd: string): Promise<ConciergeStepHistoryRecord[]> => historyByCwd[cwd] ?? []);
  return { deps: { runGit, readHistory, platformPath }, calls };
};

const specifyPass = (): ConciergeStepHistoryRecord[] => [
  { step: 'specify', status: 'pass', commitSha: 'abc', warnings: [] }
];

describe('listBranchSessions (Phase 2: reads worktrees in place, never checks out)', () => {
  it('NEVER issues a git checkout', async () => {
    const wtPath = `${HOME}/session-014`;
    const { deps, calls } = makeDeps(
      porcelain({ path: CLONE, branch: 'main' }, { path: wtPath, branch: '014-remove-faux-controls' }),
      { [wtPath]: specifyPass() }
    );

    await listBranchSessions(CLONE, deps);

    expect(calls.some((call) => call.args[0] === 'checkout')).toBe(false);
  });

  it('enumerates sessions from `worktree list --porcelain`, not from branch + checkout', async () => {
    const wtPath = `${HOME}/session-014`;
    const { deps, calls } = makeDeps(
      porcelain({ path: CLONE, branch: 'main' }, { path: wtPath, branch: '014-remove-faux-controls' }),
      { [wtPath]: specifyPass() }
    );

    await listBranchSessions(CLONE, deps);

    expect(calls.some((call) => call.cwd === CLONE && call.args[0] === 'worktree' && call.args[1] === 'list')).toBe(true);
  });

  it('reads each session worktree IN PLACE with git -C <worktreePath> (not the clone)', async () => {
    const wtPath = `${HOME}/session-014`;
    const { deps, calls } = makeDeps(
      porcelain({ path: CLONE, branch: 'main' }, { path: wtPath, branch: '014-remove-faux-controls' }),
      { [wtPath]: specifyPass() }
    );

    await listBranchSessions(CLONE, deps);

    // The per-session status read runs against the worktree path, never the clone.
    expect(calls.some((call) => call.cwd === wtPath && call.args[0] === 'status')).toBe(true);
  });

  it('parses a worktree into a session with sessionId, worktreePath, branch and 3-state', async () => {
    const wtPath = `${HOME}/session-014`;
    const { deps } = makeDeps(
      porcelain({ path: CLONE, branch: 'main' }, { path: wtPath, branch: '014-remove-faux-controls' }),
      { [wtPath]: specifyPass() }
    );

    const sessions = await listBranchSessions(CLONE, deps);

    expect(sessions).toHaveLength(1);
    const session = sessions[0]!;
    expect(session.sessionId).toBe('session-014');
    expect(session.worktreePath).toBe(wtPath);
    expect(session.branch).toBe('014-remove-faux-controls');
    expect(session.label).toBe('014-remove-faux-controls');
    // ADR-0008: only the 3 canonical states.
    expect(session.restoredStates.specify).toBe('complete');
    expect(session.restoredStates.clarify).toBe('pending');
    expect(session.restoredStates.plan).toBe('not_available');
  });

  it('does NOT clobber a real clarify:pass back to pending when specify:pass is also present (Bug 30)', async () => {
    const wtPath = `${HOME}/session-014`;
    // History (newest first, as git log returns): plan, clarify, specify all pass.
    const fullHistory: ConciergeStepHistoryRecord[] = [
      { step: 'plan', status: 'pass', commitSha: 'p1', warnings: [] },
      { step: 'clarify', status: 'pass', commitSha: 'c1', warnings: [] },
      { step: 'specify', status: 'pass', commitSha: 's1', warnings: [] }
    ];
    const { deps } = makeDeps(
      porcelain({ path: CLONE, branch: 'main' }, { path: wtPath, branch: '014-remove-faux-controls' }),
      { [wtPath]: fullHistory }
    );

    const session = (await listBranchSessions(CLONE, deps))[0]!;
    // The specify-done→clarify-pending fallback must not overwrite the real clarify:pass.
    expect(session.restoredStates.specify).toBe('complete');
    expect(session.restoredStates.clarify).toBe('complete');
    expect(session.restoredStates.plan).toBe('complete');
    expect(session.restoredStates.tasks).toBe('not_available');
    expect(session.restoredStepCommits).toEqual({
      specify: 's1',
      clarify: 'c1',
      plan: 'p1'
    });
  });

  it('strips spec/ from a legacy spec/* worktree label', async () => {
    const wtPath = `${HOME}/session-legacy`;
    const { deps } = makeDeps(
      porcelain({ path: CLONE, branch: 'main' }, { path: wtPath, branch: 'spec/draft-legacy' }),
      { [wtPath]: specifyPass() }
    );

    const sessions = await listBranchSessions(CLONE, deps);

    expect(sessions[0]!.branch).toBe('spec/draft-legacy');
    expect(sessions[0]!.label).toBe('draft-legacy');
  });

  it('treats a detached (not-yet-named) worktree as a pending, unnamed session', async () => {
    const wtPath = `${HOME}/session-detached`;
    const { deps } = makeDeps(
      porcelain({ path: CLONE, branch: 'main' }, { path: wtPath, detached: true }),
      {} // no history
    );

    const sessions = await listBranchSessions(CLONE, deps);

    expect(sessions).toHaveLength(1);
    const session = sessions[0]!;
    expect(session.branch).toBeNull();
    // The label falls back to the sessionId when the branch is not yet named.
    expect(session.label).toBe('session-detached');
    expect(session.restoredStates.specify).toBe('pending');
  });

  it("excludes the clone's own worktree (on main) from sessions", async () => {
    const wtPath = `${HOME}/session-014`;
    const { deps } = makeDeps(
      porcelain({ path: CLONE, branch: 'main' }, { path: wtPath, branch: '014-remove-faux-controls' }),
      { [wtPath]: specifyPass() }
    );

    const sessions = await listBranchSessions(CLONE, deps);

    expect(sessions.some((session) => session.worktreePath === CLONE)).toBe(false);
  });

  it('reports a worktree with a dirty (uncommitted) spec.md but no pass trailer as pending', async () => {
    const wtPath = `${HOME}/session-dirty`;
    const { deps } = makeDeps(
      porcelain({ path: CLONE, branch: 'main' }, { path: wtPath, branch: '016-dirty-in-progress' }),
      {}, // no trailer history
      { [wtPath]: '?? specs/016-dirty-in-progress/spec.md' }
    );

    const sessions = await listBranchSessions(CLONE, deps);

    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.restoredStates.specify).toBe('pending');
  });

  it('does not surface a named worktree with no trailer and no spec.md', async () => {
    const wtPath = `${HOME}/session-bare`;
    const { deps } = makeDeps(
      porcelain({ path: CLONE, branch: 'main' }, { path: wtPath, branch: '018-bare-branch' }),
      {} // no history, no spec.md
    );

    const sessions = await listBranchSessions(CLONE, deps);

    expect(sessions.some((session) => session.worktreePath === wtPath)).toBe(false);
  });
});
