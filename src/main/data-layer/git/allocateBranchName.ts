import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * OS-boundary seam for shelling out to create-new-feature.sh, mirroring the
 * defaultExecFile pattern used elsewhere. Returns stdout; tests stub it so no
 * real script (or shell) runs.
 */
export type ExecFileAdapter = (
  command: string,
  args: string[],
  options: { cwd: string }
) => Promise<{ stdout: string }>;

const defaultExecFile: ExecFileAdapter = (command, args, options) => execFileAsync(command, args, options);

// Relative path (under the clone) to the git-extension's feature-name script.
const SCRIPT_RELATIVE_PATH = path.join('.specify', 'extensions', 'git', 'scripts', 'bash', 'create-new-feature.sh');

// In-process serialization: chain allocations per clonePath so two concurrent
// requests never compute the same NNN prefix (which would make the subsequent
// `worktree add -b` collide). A module-level promise chain keyed by clone is
// enough — allocation is the app's, spec-kit only echoes the name.
const allocationChains = new Map<string, Promise<unknown>>();

const parseBranchName = (stdout: string): string => {
  // --json emits a single compact JSON line: {"BRANCH_NAME":...,"FEATURE_NUM":...,"DRY_RUN":true}.
  // Scan lines (newest-first) so any leading non-JSON noise is tolerated.
  const lines = stdout.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
  for (const line of lines.reverse()) {
    try {
      const parsed: unknown = JSON.parse(line);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'BRANCH_NAME' in parsed &&
        typeof (parsed as { BRANCH_NAME: unknown }).BRANCH_NAME === 'string'
      ) {
        const branch = (parsed as { BRANCH_NAME: string }).BRANCH_NAME;
        if (branch.length > 0) {
          return branch;
        }
      }
    } catch {
      // Not the JSON line — keep scanning.
    }
  }
  throw new Error('create-new-feature.sh --dry-run --json produced no BRANCH_NAME');
};

/**
 * RETAINED FOR FUTURE USE (no longer called from the start-session flow): with
 * the detached-worktree model (ADR-0016) spec-kit's before_specify hook owns
 * branch naming, so the app no longer pre-allocates the branch name. This pure
 * dry-run allocator is kept exported for potential future flows (e.g. preview).
 *
 * Compute the next feature branch name WITHOUT side effects.
 * Runs `create-new-feature.sh --dry-run --json [--short-name <name>] "<desc>"`
 * with cwd=clonePath so the clone (which sees every branch) computes the
 * correct NNN prefix, then parses the BRANCH_NAME out of the JSON.
 *
 * Concurrent calls for the same clonePath are serialized so they never race on
 * the same NNN.
 */
export const allocateBranchName = async (
  clonePath: string,
  description: string,
  shortName?: string,
  execFileAdapter: ExecFileAdapter = defaultExecFile
): Promise<string> => {
  const run = async (): Promise<string> => {
    const scriptPath = path.join(clonePath, SCRIPT_RELATIVE_PATH);
    const args = ['--dry-run', '--json'];
    if (shortName !== undefined && shortName.length > 0) {
      args.push('--short-name', shortName);
    }
    args.push(description);
    const { stdout } = await execFileAdapter(scriptPath, args, { cwd: clonePath });
    return parseBranchName(stdout);
  };

  const prior = allocationChains.get(clonePath) ?? Promise.resolve();
  // Chain off the prior allocation (ignoring its rejection so one failure does
  // not poison the queue), then run ours.
  const next = prior.catch(() => undefined).then(run);
  // Park a settled-but-non-throwing tail as the chain head so the next caller
  // waits for us without inheriting our rejection.
  allocationChains.set(
    clonePath,
    next.then(
      () => undefined,
      () => undefined
    )
  );
  return next;
};
