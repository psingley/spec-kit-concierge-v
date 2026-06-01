import path from 'node:path';
import { GitCommandError, readConciergeStepHistory, runGit as runGitDefault } from './gitCommand';
import { worktreesHome } from './worktreePaths';

export type StepName = 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';
export type StepState = 'not_available' | 'pending' | 'complete';

export type BranchSessionSummary = {
  // The worktree directory basename (ADR-0016): stable per-session key. Always present.
  sessionId: string;
  // The session's isolated worktree path (`<clone>.worktrees/<sessionId>/`). Reads
  // run here with `git -C <worktreePath>` — the clone is never checked out.
  worktreePath: string;
  // The worktree's branch, or null when it is still on a DETACHED HEAD (a freshly
  // created session whose spec-kit hook has not yet named the feature branch).
  branch: string | null;
  label: string;
  restoredStates: Record<StepName, StepState>;
};

export type BranchSessionsDeps = {
  // cwd-parametric, worktree-safe git runner (defaults to the real runGit). Tests
  // stub this to assert NO `checkout` is ever issued.
  runGit?: (cwd: string, args: string[]) => Promise<string>;
  readHistory?: typeof readConciergeStepHistory;
  // Path seam so the win32 worktree-home shape can be asserted in tests.
  platformPath?: Pick<typeof path, 'join' | 'dirname' | 'basename'>;
};

const emptyStates = (): Record<StepName, StepState> => ({
  specify: 'pending',
  clarify: 'not_available',
  plan: 'not_available',
  tasks: 'not_available',
  analyze: 'not_available',
  review: 'not_available'
});

const trailerStatusToState = (status: string): StepState => {
  if (status === 'pass') {
    return 'complete';
  }
  if (status === 'pending') {
    return 'pending';
  }
  return 'not_available';
};

// Branches that may carry a Concierge session: the legacy `spec/*` convention plus
// spec-kit's numbered feature branches (e.g. `014-remove-faux-controls`). The default
// `main`/`master` branches are never resumable sessions.
const DEFAULT_BRANCHES: ReadonlySet<string> = new Set(['main', 'master']);
const SPEC_KIT_FEATURE_BRANCH = /^\d{3,4}-/;

const isCandidateSessionBranch = (branch: string): boolean =>
  !DEFAULT_BRANCHES.has(branch) && (branch.startsWith('spec/') || SPEC_KIT_FEATURE_BRANCH.test(branch));

const sessionLabel = (branch: string | null, sessionId: string): string => {
  if (branch === null) {
    return sessionId;
  }
  return branch.startsWith('spec/') ? branch.replace(/^spec\//, '') : branch;
};

const isSpecMdPath = (filePath: string): boolean => /(^|\/)spec\.md$/.test(filePath.trim());

// The default branch is the comparison base: feature branches sit on top of it,
// so only commits unique to the branch (`<defaultBranch>..<branch>`) carry that
// branch's own Concierge progress. Anything inherited from the default branch —
// including historical `Concierge-Step` trailers — is not this branch's session.
const resolveDefaultBranch = async (
  repositoryPath: string,
  runGit: (cwd: string, args: string[]) => Promise<string>
): Promise<string | undefined> => {
  const output = await runGit(repositoryPath, ['branch', '--format=%(refname:short)']);
  const localBranches = new Set(
    output
      .split(/\r?\n/)
      .map((branch) => branch.trim())
      .filter((branch) => branch.length > 0)
  );
  for (const candidate of DEFAULT_BRANCHES) {
    if (localBranches.has(candidate)) {
      return candidate;
    }
  }
  return undefined;
};

// A spec.md is on the session if it is committed in a branch-unique commit OR present
// (untracked/modified) in the worktree's working tree. Reads run against the worktree
// path — NEVER a checkout in the clone.
const hasSpecMd = async (
  worktreePath: string,
  revisionRange: string | undefined,
  runGit: (cwd: string, args: string[]) => Promise<string>
): Promise<boolean> => {
  if (revisionRange !== undefined) {
    try {
      const diff = await runGit(worktreePath, ['diff', '--name-only', revisionRange]);
      if (diff.split(/\r?\n/).some(isSpecMdPath)) {
        return true;
      }
    } catch (error) {
      if (!(error instanceof GitCommandError)) {
        throw error;
      }
    }
  }
  // `--untracked-files=all` lists individual untracked files; without it git
  // collapses a fully-untracked directory to a single `specs/` entry, hiding the
  // nested spec.md.
  const status = await runGit(worktreePath, ['status', '--porcelain', '--untracked-files=all']);
  return status
    .split(/\r?\n/)
    .map((line) => line.slice(3))
    .some(isSpecMdPath);
};

type ParsedWorktree = {
  worktreePath: string;
  branch: string | null;
};

// Parse `git worktree list --porcelain`: blank-line-delimited blocks of
// `worktree <path>` / `HEAD <sha>` / (`branch refs/heads/<name>` | `detached`).
const parseWorktreeList = (porcelain: string): ParsedWorktree[] => {
  const worktrees: ParsedWorktree[] = [];
  let current: ParsedWorktree | undefined;
  for (const rawLine of porcelain.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('worktree ')) {
      if (current !== undefined) {
        worktrees.push(current);
      }
      current = { worktreePath: line.slice('worktree '.length), branch: null };
      continue;
    }
    if (current === undefined) {
      continue;
    }
    if (line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '');
    }
    // `detached` and `HEAD <sha>` leave branch null / are otherwise irrelevant here.
  }
  if (current !== undefined) {
    worktrees.push(current);
  }
  return worktrees;
};

/**
 * List resumable Concierge sessions by reading each session worktree IN PLACE
 * (ADR-0016, Phase 2). Worktrees are enumerated from `git worktree list
 * --porcelain` in the clone and each session's state is read with
 * `git -C <worktreePath> ...`. The clone is NEVER checked out — that always
 * failed for a branch already used by a worktree and blocked the start-new flow.
 */
export const listBranchSessions = async (
  clonePath: string,
  deps: BranchSessionsDeps = {}
): Promise<BranchSessionSummary[]> => {
  const runGit = deps.runGit ?? runGitDefault;
  const readHistory = deps.readHistory ?? readConciergeStepHistory;
  const platformPath = deps.platformPath ?? path;

  const porcelain = await runGit(clonePath, ['worktree', 'list', '--porcelain']);
  const worktrees = parseWorktreeList(porcelain);
  const defaultBranch = await resolveDefaultBranch(clonePath, runGit);
  // Session worktrees are SIBLINGS of the clone under `<clone>.worktrees/`; the
  // clone's own worktree entry (and any unrelated worktree) is not a session.
  const home = worktreesHome(clonePath, platformPath);

  const sessions: BranchSessionSummary[] = [];
  for (const worktree of worktrees) {
    if (platformPath.dirname(worktree.worktreePath) !== home) {
      continue;
    }
    const sessionId = platformPath.basename(worktree.worktreePath);
    // A named worktree whose branch is neither a spec/* ref nor an NNN-slug is not
    // a Concierge session. A detached worktree (branch null) is a just-created,
    // not-yet-named in-progress session and is always surfaced.
    if (worktree.branch !== null && !isCandidateSessionBranch(worktree.branch)) {
      continue;
    }

    // Scope trailers to commits unique to this branch so the default branch's
    // historical trailers never leak in. Detached / 0-unique-commit worktrees
    // yield no records and therefore inherit no completion.
    const revisionRange =
      worktree.branch !== null && defaultBranch !== undefined && defaultBranch !== worktree.branch
        ? `${defaultBranch}..${worktree.branch}`
        : undefined;
    const history = await readHistory(worktree.worktreePath, revisionRange);
    const specMdPresent = await hasSpecMd(worktree.worktreePath, revisionRange, runGit);

    const states = emptyStates();
    for (const record of history) {
      states[record.step as StepName] = trailerStatusToState(record.status);
      if (record.step === 'specify' && record.status === 'pass') {
        states.clarify = 'pending';
      }
    }

    // Dirty/in-progress: spec.md exists but no branch-unique pass trailer for
    // specify yet. This maps onto the EXISTING `pending` state (ADR-0008: pending =
    // "active OR recoverable in-flight work exists"), not a new "dirty" state.
    if (specMdPresent && states.specify !== 'complete') {
      states.specify = 'pending';
    }

    // A detached, not-yet-named worktree is an in-flight session even before any
    // spec.md exists: it was just created by start-new and specify is pending.
    const detachedInProgress = worktree.branch === null;

    // Only surface genuine resumable sessions: a named branch with at least one
    // branch-unique step trailer or in-flight spec.md work, OR a detached just-
    // created session. A bare named branch with no trailer and no spec.md is not one.
    if (!detachedInProgress && history.length === 0 && !specMdPresent) {
      continue;
    }

    sessions.push({
      sessionId,
      worktreePath: worktree.worktreePath,
      branch: worktree.branch,
      label: sessionLabel(worktree.branch, sessionId),
      restoredStates: states
    });
  }

  return sessions.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
};

// Retained for the `git:checkout` IPC (titlebar branch switching). This is NOT
// used by the session-list or resume paths — both read worktrees in place. It must
// never be called against a branch that is already checked out in a worktree.
export const checkoutBranch = async (repositoryPath: string, branch: string): Promise<{ branch: string }> => {
  await runGitDefault(repositoryPath, ['status', '--porcelain']);
  await runGitDefault(repositoryPath, ['checkout', branch]);
  return { branch };
};
