import { describe, expect, it, vi } from 'vitest';
import { resetToCleanMain } from './resetToCleanMain';

const stubRunGit = (calls: string[][], remotes: string) =>
  vi.fn(async (_repo: string, args: string[]) => {
    calls.push(args);
    return args[0] === 'remote' ? remotes : '';
  });

describe('resetToCleanMain', () => {
  it('fetches origin, checks out the default branch, and hard-resets + cleans to origin', async () => {
    const calls: string[][] = [];
    const runGit = stubRunGit(calls, 'origin');

    const result = await resetToCleanMain('/repo', 'main', { runGit });

    expect(result).toEqual({ branch: 'main' });
    expect(calls).toEqual([
      ['remote'],
      ['fetch', 'origin', '--prune'],
      ['checkout', 'main'],
      ['reset', '--hard', 'origin/main'],
      ['clean', '-fd']
    ]);
    // Critically: the app NEVER creates a spec/draft-* branch here.
    for (const args of calls) {
      expect(args.includes('-b')).toBe(false);
    }
  });

  it('cleans the local default branch without fetching when no origin remote exists', async () => {
    const calls: string[][] = [];
    const runGit = stubRunGit(calls, '');

    const result = await resetToCleanMain('/repo', 'main', { runGit });

    expect(result).toEqual({ branch: 'main' });
    expect(calls).toEqual([
      ['remote'],
      ['checkout', 'main'],
      ['clean', '-fd']
    ]);
    for (const args of calls) {
      expect(args[0]).not.toBe('fetch');
    }
  });

  it('defaults to main when no default branch is supplied', async () => {
    const calls: string[][] = [];
    const runGit = stubRunGit(calls, 'origin');
    await resetToCleanMain('/repo', undefined, { runGit });
    expect(calls[2]).toEqual(['checkout', 'main']);
    expect(calls[3]).toEqual(['reset', '--hard', 'origin/main']);
  });
});
