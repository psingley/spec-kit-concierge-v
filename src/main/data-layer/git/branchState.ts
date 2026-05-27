import { GitCommandError, runGit } from './gitCommand';

export type BranchState = {
  branch: string;
  ahead: number;
  behind: number;
  dirty: boolean;
};

const parseAheadBehind = (output: string): Pick<BranchState, 'ahead' | 'behind'> => {
  const [behindText, aheadText] = output.split(/\s+/);

  return {
    ahead: Number.parseInt(aheadText ?? '0', 10),
    behind: Number.parseInt(behindText ?? '0', 10)
  };
};

const hasUpstream = async (repositoryPath: string): Promise<boolean> => {
  try {
    await runGit(repositoryPath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);

    return true;
  } catch (error) {
    if (error instanceof GitCommandError) {
      return false;
    }

    throw error;
  }
};

export const readBranchState = async (repositoryPath: string): Promise<BranchState> => {
  await runGit(repositoryPath, ['rev-parse', '--is-inside-work-tree']);
  const branch = await runGit(repositoryPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const dirty = (await runGit(repositoryPath, ['status', '--porcelain'])).length > 0;
  const upstreamExists = await hasUpstream(repositoryPath);
  const aheadBehind = upstreamExists
    ? parseAheadBehind(await runGit(repositoryPath, ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']))
    : { ahead: 0, behind: 0 };

  return {
    branch,
    ahead: aheadBehind.ahead,
    behind: aheadBehind.behind,
    dirty
  };
};
