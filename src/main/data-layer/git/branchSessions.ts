import { GitCommandError, readConciergeStepHistory, runGit } from './gitCommand';

export type StepName = 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';
export type StepState = 'not_available' | 'pending' | 'complete';

export type BranchSessionSummary = {
  branch: string;
  label: string;
  restoredStates: Record<StepName, StepState>;
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

const sessionLabel = (branch: string): string => (branch.startsWith('spec/') ? branch.replace(/^spec\//, '') : branch);

const isSpecMdPath = (filePath: string): boolean => /(^|\/)spec\.md$/.test(filePath.trim());

// The default branch is the comparison base: feature branches sit on top of it,
// so only commits unique to the branch (`<defaultBranch>..<branch>`) carry that
// branch's own Concierge progress. Anything inherited from the default branch —
// including historical `Concierge-Step` trailers — is not this branch's session.
const resolveDefaultBranch = async (repositoryPath: string): Promise<string | undefined> => {
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

// A spec.md is on the branch if it is committed in a branch-unique commit OR present
// (untracked/modified) in the working tree of the checked-out branch.
const hasSpecMd = async (repositoryPath: string, revisionRange: string | undefined): Promise<boolean> => {
  if (revisionRange !== undefined) {
    try {
      const diff = await runGit(repositoryPath, ['diff', '--name-only', revisionRange]);
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
  const status = await runGit(repositoryPath, ['status', '--porcelain', '--untracked-files=all']);
  return status
    .split(/\r?\n/)
    .map((line) => line.slice(3))
    .some(isSpecMdPath);
};

export const listBranchSessions = async (repositoryPath: string): Promise<BranchSessionSummary[]> => {
  const output = await runGit(repositoryPath, ['branch', '--format=%(refname:short)']);
  const currentBranch = await runGit(repositoryPath, ['branch', '--show-current']);
  const branches = output
    .split(/\r?\n/)
    .map((branch) => branch.trim())
    .filter(isCandidateSessionBranch);

  const originalBranch = currentBranch.trim();
  const defaultBranch = await resolveDefaultBranch(repositoryPath);
  const sessions: BranchSessionSummary[] = [];
  try {
    for (const branch of branches) {
      if (branch !== originalBranch) {
        await runGit(repositoryPath, ['checkout', branch]);
      }
      // Scope trailers to commits unique to this branch so the default branch's
      // historical trailers never leak in. A branch with 0 unique commits yields
      // no records and therefore inherits no completion.
      const revisionRange = defaultBranch !== undefined && defaultBranch !== branch ? `${defaultBranch}..${branch}` : undefined;
      const history = await readConciergeStepHistory(repositoryPath, revisionRange);
      const specMdPresent = await hasSpecMd(repositoryPath, revisionRange);

      const states = emptyStates();
      for (const record of history) {
        states[record.step] = trailerStatusToState(record.status);
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

      // Only surface branches that are genuine resumable sessions: at least one
      // branch-unique step trailer, or in-flight spec.md work. A bare branch with no
      // trailer and no spec.md is not a session.
      if (history.length === 0 && !specMdPresent) {
        continue;
      }

      sessions.push({ branch, label: sessionLabel(branch), restoredStates: states });
    }
  } finally {
    if (originalBranch.length > 0) {
      await runGit(repositoryPath, ['checkout', '-f', originalBranch]);
    }
  }

  return sessions.sort((a, b) => a.branch.localeCompare(b.branch));
};

export const checkoutBranch = async (repositoryPath: string, branch: string): Promise<{ branch: string }> => {
  await runGit(repositoryPath, ['status', '--porcelain']);
  await runGit(repositoryPath, ['checkout', branch]);
  return { branch };
};
