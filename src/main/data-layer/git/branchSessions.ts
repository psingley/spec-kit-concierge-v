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

export const listBranchSessions = async (repositoryPath: string): Promise<BranchSessionSummary[]> => {
  const output = await runGit(repositoryPath, ['branch', '--format=%(refname:short)']);
  const currentBranch = await runGit(repositoryPath, ['branch', '--show-current']);
  const branches = output
    .split(/\r?\n/)
    .map((branch) => branch.trim())
    .filter((branch) => branch.startsWith('spec/'));

  const originalBranch = currentBranch.trim();
  const sessions: BranchSessionSummary[] = [];
  for (const branch of branches) {
    if (branch !== originalBranch) {
      await runGit(repositoryPath, ['checkout', branch]);
    }
    const states = emptyStates();
    for (const record of await readConciergeStepHistory(repositoryPath)) {
      states[record.step] = trailerStatusToState(record.status);
      if (record.step === 'specify' && record.status === 'pass') {
        states.clarify = 'pending';
      }
    }
    sessions.push({ branch, label: branch.replace(/^spec\//, ''), restoredStates: states });
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

export const createDraftBranch = async (
  repositoryPath: string,
  now: () => number = () => Date.now()
): Promise<{ branch: string }> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const branch = `spec/draft-${(now() + attempt).toString(36)}`;
    try {
      await runGit(repositoryPath, ['checkout', '-b', branch]);
      return { branch };
    } catch (error) {
      if (attempt === 4) {
        throw error;
      }
    }
  }
  throw new Error('Unable to create draft branch.');
};
