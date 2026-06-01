import { describe, expect, it, vi } from 'vitest';
import { resetToCleanMain } from './resetToCleanMain';

const stubRunGit = (calls: string[][], remotes: string) =>
  vi.fn(async (_repo: string, args: string[]) => {
    calls.push(args);
    return args[0] === 'remote' ? remotes : '';
  });

/**
 * A runGit stub that returns distinct, deterministic shas so the catch-up
 * evidence (beforeSha/afterSha/originSha/commitsAdvanced) can be asserted.
 * - `rev-parse HEAD` returns `beforeSha` on the first call (before reset) and
 *   `afterSha` on the second call (after reset).
 * - `rev-parse origin/<branch>` returns `originSha`.
 * - `rev-list --count <before>..<after>` returns the advanced count.
 */
const stubCatchUpRunGit = (
  calls: string[][],
  shas: { beforeSha: string; afterSha: string; originSha: string; count: string }
) => {
  let headCalls = 0;
  return vi.fn(async (_repo: string, args: string[]) => {
    calls.push(args);
    if (args[0] === 'remote') return 'origin';
    if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
      headCalls += 1;
      return headCalls === 1 ? shas.beforeSha : shas.afterSha;
    }
    if (args[0] === 'rev-parse' && args[1]?.startsWith('origin/')) {
      return shas.originSha;
    }
    if (args[0] === 'rev-list') return shas.count;
    return '';
  });
};

describe('resetToCleanMain', () => {
  it('fetches origin, captures shas, checks out, hard-resets + cleans, and returns catch-up evidence', async () => {
    const calls: string[][] = [];
    const runGit = stubCatchUpRunGit(calls, {
      beforeSha: 'aaaaaaa',
      afterSha: 'bbbbbbb',
      originSha: 'bbbbbbb',
      count: '12'
    });

    const result = await resetToCleanMain('/repo', 'main', { runGit });

    expect(result).toEqual({
      branch: 'main',
      beforeSha: 'aaaaaaa',
      afterSha: 'bbbbbbb',
      originSha: 'bbbbbbb',
      commitsAdvanced: 12
    });

    // Exact command sequence: fetch -> capture before HEAD -> capture origin target
    // -> checkout -> reset --hard origin/<branch> -> capture after HEAD -> rev-list -> clean.
    expect(calls).toEqual([
      ['remote'],
      ['fetch', 'origin', '--prune'],
      ['rev-parse', 'HEAD'],
      ['rev-parse', 'origin/main'],
      ['checkout', 'main'],
      ['reset', '--hard', 'origin/main'],
      ['rev-parse', 'HEAD'],
      ['rev-list', '--count', 'aaaaaaa..bbbbbbb'],
      ['clean', '-fd']
    ]);

    // Critically: the app NEVER creates a spec/draft-* branch here.
    for (const args of calls) {
      expect(args.includes('-b')).toBe(false);
    }
  });

  it('targets the supplied non-main default branch (e.g. develop)', async () => {
    const calls: string[][] = [];
    const runGit = stubCatchUpRunGit(calls, {
      beforeSha: 'c0ffee0',
      afterSha: 'c0ffee0',
      originSha: 'c0ffee0',
      count: '0'
    });

    const result = await resetToCleanMain('/repo', 'develop', { runGit });

    expect(result).toEqual({
      branch: 'develop',
      beforeSha: 'c0ffee0',
      afterSha: 'c0ffee0',
      originSha: 'c0ffee0',
      commitsAdvanced: 0
    });
    expect(calls).toEqual([
      ['remote'],
      ['fetch', 'origin', '--prune'],
      ['rev-parse', 'HEAD'],
      ['rev-parse', 'origin/develop'],
      ['checkout', 'develop'],
      ['reset', '--hard', 'origin/develop'],
      ['rev-parse', 'HEAD'],
      ['rev-list', '--count', 'c0ffee0..c0ffee0'],
      ['clean', '-fd']
    ]);
  });

  it('cleans the local default branch without fetching or resetting when no origin remote exists', async () => {
    const calls: string[][] = [];
    const runGit = stubRunGit(calls, '');

    const result = await resetToCleanMain('/repo', 'main', { runGit });

    expect(result).toEqual({
      branch: 'main',
      beforeSha: null,
      afterSha: null,
      originSha: null,
      commitsAdvanced: 0
    });
    expect(calls).toEqual([
      ['remote'],
      ['checkout', 'main'],
      ['clean', '-fd']
    ]);
    for (const args of calls) {
      expect(args[0]).not.toBe('fetch');
      expect(args[0]).not.toBe('reset');
    }
  });

  it('defaults to main when no default branch is supplied', async () => {
    const calls: string[][] = [];
    const runGit = stubCatchUpRunGit(calls, {
      beforeSha: 'aaaaaaa',
      afterSha: 'bbbbbbb',
      originSha: 'bbbbbbb',
      count: '3'
    });
    const result = await resetToCleanMain('/repo', undefined, { runGit });
    expect(result.branch).toBe('main');
    expect(calls).toContainEqual(['checkout', 'main']);
    expect(calls).toContainEqual(['reset', '--hard', 'origin/main']);
  });
});
