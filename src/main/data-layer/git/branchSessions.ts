import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { readFailedStepMarkers, type FailedStepRecord, type RestoredStepFailures } from '../failedSteps';
import { GitCommandError, readConciergeStepHistory, runGit as runGitDefault } from './gitCommand';
import { worktreesHome } from './worktreePaths';

export type StepName = 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';
export type StepState = 'not_available' | 'pending' | 'complete';
export type RestoredStepCommits = Partial<Record<StepName, string>>;

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
  restoredStepCommits: RestoredStepCommits;
  restoredFailures: RestoredStepFailures;
};

export type BranchSessionsDeps = {
  // cwd-parametric, worktree-safe git runner (defaults to the real runGit). Tests
  // stub this to assert NO `checkout` is ever issued.
  runGit?: (cwd: string, args: string[]) => Promise<string>;
  readHistory?: typeof readConciergeStepHistory;
  readFailedSteps?: typeof readFailedStepMarkers;
  readManifestEvidence?: (worktreePath: string) => Promise<ManifestResumeEvidence | undefined>;
  detectStrandedTasksFailure?: typeof detectStrandedTasksFailure;
  // Path seam so the win32 worktree-home shape can be asserted in tests.
  platformPath?: Pick<typeof path, 'join' | 'dirname' | 'basename'>;
};

export type ManifestResumeTerminalStatus =
  | 'pending'
  | 'running'
  | 'pass'
  | 'needs-attention'
  | 'failed'
  | 'killed'
  | 'interrupted';

export type ManifestResumeEvidence = {
  currentStep: StepName;
  terminalStatus: ManifestResumeTerminalStatus;
  completedSteps: StepName[];
  restoredStepCommits?: RestoredStepCommits;
  failedStep?: FailedStepRecord;
};

export type ResumeReconstructionCase = {
  currentStep: StepName;
  manifestAttemptStatus: ManifestResumeTerminalStatus;
  hasMatchingTrailer: boolean;
  hasRequiredArtifacts: boolean;
  hasFailedMarker: boolean;
};

const STEP_ORDER: StepName[] = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'];

const nextStep = (step: StepName): StepName =>
  STEP_ORDER[Math.min(STEP_ORDER.indexOf(step) + 1, STEP_ORDER.length - 1)] ?? step;

export const reconstructResumeCase = (
  testCase: ResumeReconstructionCase
): { currentStep: StepName; terminalStatus: ManifestResumeTerminalStatus } => {
  if (
    testCase.manifestAttemptStatus === 'pass' &&
    testCase.hasMatchingTrailer &&
    testCase.hasRequiredArtifacts &&
    !testCase.hasFailedMarker
  ) {
    return { currentStep: nextStep(testCase.currentStep), terminalStatus: 'pass' };
  }

  if (
    testCase.manifestAttemptStatus === 'failed' &&
    !testCase.hasMatchingTrailer &&
    testCase.hasFailedMarker
  ) {
    return { currentStep: testCase.currentStep, terminalStatus: 'needs-attention' };
  }

  return {
    currentStep: testCase.currentStep,
    terminalStatus: testCase.manifestAttemptStatus
  };
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

const readFeatureDirectory = async (worktreePath: string): Promise<string | undefined> => {
  try {
    const parsed = JSON.parse(await readFile(path.join(worktreePath, '.specify', 'feature.json'), 'utf8')) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      typeof (parsed as { feature_directory?: unknown }).feature_directory === 'string'
    ) {
      return (parsed as { feature_directory: string }).feature_directory;
    }
  } catch {
    return undefined;
  }
  return undefined;
};

export const detectStrandedTasksFailure = async (
  worktreePath: string,
  runGit: (cwd: string, args: string[]) => Promise<string>,
  platformPath: Pick<typeof path, 'join' | 'basename'> = path
): Promise<RestoredStepFailures['tasks'] | undefined> => {
  const featureDirectory = await readFeatureDirectory(worktreePath);
  if (featureDirectory === undefined) {
    return undefined;
  }
  const expectedTasksPath = platformPath.join(featureDirectory, 'tasks.md');
  try {
    await access(platformPath.join(worktreePath, expectedTasksPath));
    return undefined;
  } catch {
    // Missing expected tasks.md is the only case where sibling dirty tasks can be a failure clue.
  }

  const status = await runGit(worktreePath, ['status', '--porcelain', '--untracked-files=all']);
  const strandedArtifacts = status
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter((filePath) => /^specs\/[^/]+\/tasks\.md$/.test(filePath) && filePath !== expectedTasksPath)
    .sort();
  if (strandedArtifacts.length === 0) {
    return undefined;
  }
  return {
    step: 'tasks',
    sessionId: platformPath.basename(worktreePath),
    failedAt: 'unknown',
    reason: `factory-rejected: expected ${expectedTasksPath}; found stranded tasks.md at ${strandedArtifacts.join(', ')}`,
    strandedArtifacts,
    anomalyIds: []
  };
};

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
  const readFailedSteps = deps.readFailedSteps ?? readFailedStepMarkers;
  const readManifestEvidence = deps.readManifestEvidence;
  const detectTasksFailure = deps.detectStrandedTasksFailure ?? detectStrandedTasksFailure;
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
    const restoredFailures = { ...(await readFailedSteps(worktree.worktreePath)) };
    const manifestEvidence = await readManifestEvidence?.(worktree.worktreePath);

    const states = emptyStates();
    const restoredStepCommits: RestoredStepCommits = {};
    const seenSteps = new Set<StepName>();
    for (const record of history) {
      const step = record.step as StepName;
      if (seenSteps.has(step)) {
        continue;
      }
      seenSteps.add(step);
      states[step] = trailerStatusToState(record.status);
      restoredStepCommits[step] = record.commitSha;
    }
    // "specify done → clarify becomes available" is only a fallback for when clarify
    // has no trailer of its own yet. Applied after the loop and guarded on
    // not_available so it never clobbers a real clarify:pass (complete) back to
    // pending — that bug made resume of a clarified session land back on Clarify.
    if (states.specify === 'complete' && states.clarify === 'not_available') {
      states.clarify = 'pending';
    }

    // Dirty/in-progress: spec.md exists but no branch-unique pass trailer for
    // specify yet. This maps onto the EXISTING `pending` state (ADR-0008: pending =
    // "active OR recoverable in-flight work exists"), not a new "dirty" state.
    if (specMdPresent && states.specify !== 'complete') {
      states.specify = 'pending';
    }

    if (restoredFailures.tasks === undefined && states.plan === 'complete' && states.tasks !== 'complete') {
      const strandedTasksFailure = await detectTasksFailure(worktree.worktreePath, runGit, platformPath);
      if (strandedTasksFailure !== undefined) {
        restoredFailures.tasks = strandedTasksFailure;
      }
    }

    if (manifestEvidence !== undefined) {
      for (const completedStep of manifestEvidence.completedSteps) {
        states[completedStep] = 'complete';
      }
      Object.assign(restoredStepCommits, manifestEvidence.restoredStepCommits);
      if (manifestEvidence.terminalStatus === 'pass') {
        states[manifestEvidence.currentStep] = 'complete';
        const availableStep = nextStep(manifestEvidence.currentStep);
        if (states[availableStep] === 'not_available') {
          states[availableStep] = 'pending';
        }
      } else if (manifestEvidence.terminalStatus !== 'pending') {
        states[manifestEvidence.currentStep] = 'pending';
      }
      if (manifestEvidence.terminalStatus === 'needs-attention' && manifestEvidence.failedStep !== undefined) {
        restoredFailures[manifestEvidence.failedStep.step] = manifestEvidence.failedStep;
      }
    }

    for (const failedStep of Object.keys(restoredFailures) as StepName[]) {
      if (states[failedStep] !== 'complete') {
        states[failedStep] = 'pending';
      }
    }

    // A detached, not-yet-named worktree is an in-flight session even before any
    // spec.md exists: it was just created by start-new and specify is pending.
    const detachedInProgress = worktree.branch === null;

    // Only surface genuine resumable sessions: a named branch with at least one
    // branch-unique step trailer or in-flight spec.md work, OR a detached just-
    // created session. A bare named branch with no trailer and no spec.md is not one.
    if (!detachedInProgress && manifestEvidence === undefined && history.length === 0 && !specMdPresent && Object.keys(restoredFailures).length === 0) {
      continue;
    }

    sessions.push({
      sessionId,
      worktreePath: worktree.worktreePath,
      branch: worktree.branch,
      label: sessionLabel(worktree.branch, sessionId),
      restoredStates: states,
      restoredStepCommits,
      restoredFailures
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
