import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class GitCommandError extends Error {
  constructor(
    message: string,
    readonly command: string[],
    readonly cause: unknown
  ) {
    super(message);
    this.name = 'GitCommandError';
  }
}

export const runGit = async (repositoryPath: string, args: string[]): Promise<string> => {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd: repositoryPath });

    return stdout.trim();
  } catch (error) {
    throw new GitCommandError(`git ${args.join(' ')} failed`, ['git', ...args], error);
  }
};
