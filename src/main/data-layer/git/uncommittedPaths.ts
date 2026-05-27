import { runGit } from './gitCommand';

export type UncommittedPathsResult = {
  hasUncommittedChanges: boolean;
  changedPaths: string[];
};

const parsePorcelainPath = (line: string): string | undefined => {
  const pathText = line.replace(/^(?:..|.)\s+/, '').trim();

  if (pathText.length === 0) {
    return undefined;
  }

  return pathText.includes(' -> ') ? pathText.split(' -> ').at(-1) : pathText;
};

export const readUncommittedPaths = async (
  repositoryPath: string,
  paths: string[]
): Promise<UncommittedPathsResult> => {
  await runGit(repositoryPath, ['rev-parse', '--is-inside-work-tree']);

  if (paths.length === 0) {
    return { hasUncommittedChanges: false, changedPaths: [] };
  }

  const output = await runGit(repositoryPath, ['status', '--porcelain', '--', ...paths]);
  const changedPaths = output
    .split(/\r?\n/)
    .map(parsePorcelainPath)
    .filter((changedPath): changedPath is string => changedPath !== undefined);

  return {
    hasUncommittedChanges: changedPaths.length > 0,
    changedPaths
  };
};
