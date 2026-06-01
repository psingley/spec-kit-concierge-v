import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tmpdir } from 'node:os';
import { GitCommandError, runGit } from './gitCommand';

describe('runGit cwd validation', () => {
  it('throws a "not cloned locally" error (not a raw ENOENT) when the cwd is missing', async () => {
    const missing = path.join(tmpdir(), 'concierge-does-not-exist', 'psingley', 'workcells');
    const error = await runGit(missing, ['status', '--porcelain']).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toMatch(/repository not cloned locally/i);
    expect(message).toContain(missing);
    // The misleading bare-ENOENT must not surface to the user.
    expect(message).not.toMatch(/spawn git ENOENT/i);
  });

  it('still surfaces GitCommandError for an existing-but-non-repo cwd', async () => {
    const realButNotRepo = tmpdir();
    await expect(runGit(realButNotRepo, ['rev-parse', '--git-dir'])).rejects.toBeInstanceOf(GitCommandError);
  });
});
