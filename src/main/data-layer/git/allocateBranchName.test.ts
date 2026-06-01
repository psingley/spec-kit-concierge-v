import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { allocateBranchName, type ExecFileAdapter } from './allocateBranchName';

const clonePath = path.join('/Users', 'dev', 'Documents', 'Concierge', 'psingley', 'workcells');
const scriptPath = path.join(clonePath, '.specify', 'extensions', 'git', 'scripts', 'bash', 'create-new-feature.sh');

const dryRunJson = (branch: string): string => JSON.stringify({ BRANCH_NAME: branch, FEATURE_NUM: '003', DRY_RUN: true });

describe('allocateBranchName', () => {
  it('shells create-new-feature.sh --dry-run --json with cwd=clonePath and parses BRANCH_NAME', async () => {
    const exec = vi.fn(async () => ({ stdout: dryRunJson('003-add-dark-mode') })) as unknown as ExecFileAdapter;

    const branch = await allocateBranchName(clonePath, 'Add dark mode', undefined, exec);

    expect(branch).toBe('003-add-dark-mode');
    expect(exec).toHaveBeenCalledWith(scriptPath, ['--dry-run', '--json', 'Add dark mode'], { cwd: clonePath });
  });

  it('passes --short-name when provided', async () => {
    const exec = vi.fn(async () => ({ stdout: dryRunJson('003-dark') })) as unknown as ExecFileAdapter;

    await allocateBranchName(clonePath, 'Add dark mode', 'dark', exec);

    expect(exec).toHaveBeenCalledWith(
      scriptPath,
      ['--dry-run', '--json', '--short-name', 'dark', 'Add dark mode'],
      { cwd: clonePath }
    );
  });

  it('tolerates leading non-JSON noise and parses the JSON line', async () => {
    const exec = vi.fn(async () => ({
      stdout: `warning: something\n${dryRunJson('007-feature')}\n`
    })) as unknown as ExecFileAdapter;

    expect(await allocateBranchName(clonePath, 'Feature', undefined, exec)).toBe('007-feature');
  });

  it('serializes concurrent allocations for the same clonePath (second awaits the first)', async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const exec = vi.fn(async (_cmd: string, args: string[]) => {
      const desc = args[args.length - 1];
      order.push(`start:${desc}`);
      if (desc === 'first') {
        await firstGate;
      }
      order.push(`end:${desc}`);
      return { stdout: dryRunJson(desc === 'first' ? '003-first' : '004-second') };
    }) as unknown as ExecFileAdapter;

    const p1 = allocateBranchName(clonePath, 'first', undefined, exec);
    const p2 = allocateBranchName(clonePath, 'second', undefined, exec);

    // Let all currently-runnable microtasks drain. The first allocation starts
    // (and blocks on the gate); the second must NOT start until the first ends.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(order).toEqual(['start:first']);
    releaseFirst?.();

    const [b1, b2] = await Promise.all([p1, p2]);
    expect(b1).toBe('003-first');
    expect(b2).toBe('004-second');
    expect(order).toEqual(['start:first', 'end:first', 'start:second', 'end:second']);
  });
});
