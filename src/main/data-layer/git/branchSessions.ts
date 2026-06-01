import { readConciergeStepHistory, runGit } from './gitCommand';

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

export const listBranchSessions = async (repositoryPath: string): Promise<BranchSessionSummary[]> => {
  const output = await runGit(repositoryPath, ['branch', '--format=%(refname:short)']);
  const currentBranch = await runGit(repositoryPath, ['branch', '--show-current']);
  const branches = output
    .split(/\r?\n/)
    .map((branch) => branch.trim())
    .filter(isCandidateSessionBranch);

  const originalBranch = currentBranch.trim();
  const sessions: BranchSessionSummary[] = [];
  for (const branch of branches) {
    if (branch !== originalBranch) {
      await runGit(repositoryPath, ['checkout', branch]);
    }
    const history = await readConciergeStepHistory(repositoryPath);
    // Only branches with a real Concierge session (≥1 step trailer) are resumable.
    if (history.length === 0) {
      continue;
    }
    const states = emptyStates();
    for (const record of history) {
      states[record.step] = trailerStatusToState(record.status);
      if (record.step === 'specify' && record.status === 'pass') {
        states.clarify = 'pending';
      }
    }
    sessions.push({ branch, label: sessionLabel(branch), restoredStates: states });
  }
  if (originalBranch.length > 0) {
    await runGit(repositoryPath, ['checkout', originalBranch]);
  }

  return sessions.sort((a, b) => a.branch.localeCompare(b.branch));
};

export const checkoutBranch = async (repositoryPath: string, branch: string): Promise<{ branch: string }> => {
  await runGit(repositoryPath, ['status', '--porcelain']);
  await runGit(repositoryPath, ['checkout', branch]);
  return { branch };
};
