import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  findMatchingStepCompletion,
  parseStepCompletionHistory
} from './stepCompletionHistory';

describe('stepCompletionHistory', () => {
  it('parses matching, duplicate, out-of-order, and mismatched artifact snapshot trailers', async () => {
    const fixture = await readFile(path.join(process.cwd(), 'tests/fixtures/hybrid-manifest/branch-trailers.txt'), 'utf8');

    const records = parseStepCompletionHistory(fixture);

    expect(records).toEqual([
      expect.objectContaining({
        commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        step: 'specify',
        status: 'pass',
        artifactSnapshotHash: '24113e2c829839c1a62528675dd2532602f15ed08addd9c82473ecb953499503'
      }),
      expect.objectContaining({ commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', step: 'specify' }),
      expect.objectContaining({ commitSha: 'cccccccccccccccccccccccccccccccccccccccc', step: 'tasks' }),
      expect.objectContaining({ commitSha: 'dddddddddddddddddddddddddddddddddddddddd', step: 'plan' }),
      expect.objectContaining({ commitSha: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', step: 'review' })
    ]);
  });

  it('finds a valid matching completion and rejects trailer/content mismatch', async () => {
    const fixture = await readFile(path.join(process.cwd(), 'tests/fixtures/hybrid-manifest/branch-trailers.txt'), 'utf8');
    const records = parseStepCompletionHistory(fixture);

    expect(findMatchingStepCompletion(records, {
      step: 'plan',
      status: 'pass',
      artifactSnapshotHash: '6f9db3bbf653566da89a41481b1078d34b1ffbee0b39e1ef68a53cd34288688d'
    })).toMatchObject({
      commitSha: 'dddddddddddddddddddddddddddddddddddddddd',
      adoptedFromHistory: true
    });

    expect(findMatchingStepCompletion(records, {
      step: 'tasks',
      status: 'pass',
      artifactSnapshotHash: 'different'.padEnd(64, '0')
    })).toBeUndefined();
  });

  it('reads branch history through the git command path', async () => {
    const gitLog = [
      '1111111111111111111111111111111111111111',
      '\0',
      'feat: specify\n\nConcierge-Step: specify:pass\nArtifact-Snapshot: ',
      'a'.repeat(64),
      '\x1e'
    ].join('');
    const runGit = vi.fn(async () => gitLog);

    const result = await findMatchingStepCompletion('/repo', {
      step: 'specify',
      status: 'pass',
      artifactSnapshotHash: 'a'.repeat(64),
      runGit
    });

    expect(runGit).toHaveBeenCalledWith('/repo', ['log', '--format=%H%x00%B%x1e']);
    expect(result).toMatchObject({
      commitSha: '1111111111111111111111111111111111111111',
      adoptedFromHistory: true
    });
  });
});
