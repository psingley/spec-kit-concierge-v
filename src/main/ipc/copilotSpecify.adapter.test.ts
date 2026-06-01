import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { buildSpecifyPrompt, runSpecifyPrintMode, type SpawnAdapter } from './copilotSpecify';

// ---------------------------------------------------------------------------
// buildSpecifyPrompt
// ---------------------------------------------------------------------------

describe('buildSpecifyPrompt', () => {
  it('returns the raw feature description — no slash-command prefix', () => {
    const prompt = buildSpecifyPrompt('Add dark mode to the dashboard');

    // Agent is pinned via --agent flag; -p receives only the user description.
    expect(prompt).toBe('Add dark mode to the dashboard');
    expect(prompt).not.toContain('/speckit.specify');
  });

  it('passes the description through unchanged', () => {
    const desc = 'Remove the fake traffic lights';
    expect(buildSpecifyPrompt(desc)).toBe(desc);
  });
});

// ---------------------------------------------------------------------------
// Fake child-process builder
// ---------------------------------------------------------------------------

type FakeChildOptions = {
  stdoutLines?: string[];
  stderrLines?: string[];
  exitCode?: number;
};

/**
 * Returns a minimal EventEmitter-based fake that mimics a spawned ChildProcess.
 * Resolves synchronously on the next tick so tests don't need to await I/O.
 */
const makeFakeChild = ({ stdoutLines = [], stderrLines = [], exitCode = 0 }: FakeChildOptions = {}) => {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
  child.stdout = stdout;
  child.stderr = stderr;

  // Emit data + close on the next microtask tick so the caller has time to
  // attach listeners first.
  void Promise.resolve().then(() => {
    for (const line of stdoutLines) {
      stdout.emit('data', Buffer.from(line + '\n'));
    }
    for (const line of stderrLines) {
      stderr.emit('data', Buffer.from(line + '\n'));
    }
    child.emit('close', exitCode);
  });

  return child;
};

// ---------------------------------------------------------------------------
// runSpecifyPrintMode — spawn argv
// ---------------------------------------------------------------------------

describe('runSpecifyPrintMode spawn argv', () => {
  it('pins the agent via --agent flag and passes raw description to -p (no slash prefix)', async () => {
    const spawnFn = vi.fn(() => makeFakeChild()) as unknown as SpawnAdapter;

    await runSpecifyPrintMode(
      'copilot',
      ['--allow-all-tools'],
      'My feature',
      '/work/repo',
      undefined,
      undefined,
      spawnFn
    );

    expect(spawnFn).toHaveBeenCalledWith(
      'copilot',
      ['--agent', 'speckit.specify', '--allow-all-tools', '-p', 'My feature'],
      expect.objectContaining({ cwd: '/work/repo', shell: false })
    );
  });

  it('argv does NOT contain a /speckit.specify slash prefix in the -p value', async () => {
    const spawnFn = vi.fn(() => makeFakeChild()) as unknown as SpawnAdapter;

    await runSpecifyPrintMode('copilot', ['--allow-all-tools'], 'My feature', '/work/repo', undefined, undefined, spawnFn);

    const [, argv] = (spawnFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string[]];
    const pIdx = argv.indexOf('-p');
    expect(pIdx).toBeGreaterThan(-1);
    expect(argv[pIdx + 1]).toBe('My feature');
    expect(argv[pIdx + 1]).not.toMatch(/^\/speckit/);
  });

  it('inserts --model <id> after --agent and before launchArgs when modelId is provided', async () => {
    const spawnFn = vi.fn(() => makeFakeChild()) as unknown as SpawnAdapter;

    await runSpecifyPrintMode(
      'copilot',
      ['--allow-all-tools'],
      'My feature',
      '/work/repo',
      'gpt-5.5',
      undefined,
      spawnFn
    );

    expect(spawnFn).toHaveBeenCalledWith(
      'copilot',
      ['--agent', 'speckit.specify', '--model', 'gpt-5.5', '--allow-all-tools', '-p', 'My feature'],
      expect.objectContaining({ cwd: '/work/repo', shell: false })
    );
  });

  it('sets cwd to the repositoryPath, not process.cwd()', async () => {
    const spawnFn = vi.fn(() => makeFakeChild()) as unknown as SpawnAdapter;

    await runSpecifyPrintMode('copilot', [], 'my feature', '/target/repo', undefined, undefined, spawnFn);

    const [, , opts] = (spawnFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string[], { cwd: string }];
    expect(opts.cwd).toBe('/target/repo');
  });
});

// ---------------------------------------------------------------------------
// runSpecifyPrintMode — stdout streaming
// ---------------------------------------------------------------------------

describe('runSpecifyPrintMode stdout streaming', () => {
  it('calls onLine for each stdout line emitted by the process', async () => {
    const lines: string[] = [];
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['Creating feature directory...', 'Writing spec.md'] })
    ) as unknown as SpawnAdapter;

    await runSpecifyPrintMode(
      'copilot', ['--allow-all-tools'], 'my feature', '/repo', undefined,
      (line) => lines.push(line),
      spawnFn
    );

    expect(lines).toEqual(['Creating feature directory...', 'Writing spec.md']);
  });

  it('does not call onLine for blank lines', async () => {
    const lines: string[] = [];
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['', 'Meaningful output', ''] })
    ) as unknown as SpawnAdapter;

    await runSpecifyPrintMode(
      'copilot', ['--allow-all-tools'], 'my feature', '/repo', undefined,
      (line) => lines.push(line),
      spawnFn
    );

    expect(lines).toEqual(['Meaningful output']);
  });
});

// ---------------------------------------------------------------------------
// runSpecifyPrintMode — failure detection (FIX 2)
// ---------------------------------------------------------------------------

describe('runSpecifyPrintMode failure detection', () => {
  it('rejects with the failure detail when exit code is non-zero', async () => {
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['some output'], exitCode: 1 })
    ) as unknown as SpawnAdapter;

    await expect(
      runSpecifyPrintMode('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).rejects.toThrow('Copilot specify failed');
  });

  it('includes "Skill not found" detail in the rejection when present in stdout', async () => {
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['Skill not found: speckit.specify'], exitCode: 1 })
    ) as unknown as SpawnAdapter;

    await expect(
      runSpecifyPrintMode('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).rejects.toThrow('Skill not found: speckit.specify');
  });

  it('rejects when stdout contains a failure marker even if exit code is 0', async () => {
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['Error: something went wrong'], exitCode: 0 })
    ) as unknown as SpawnAdapter;

    await expect(
      runSpecifyPrintMode('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).rejects.toThrow('Copilot specify failed');
  });

  it('rejects when stderr contains a failure marker', async () => {
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stderrLines: ['error: authentication failed'], exitCode: 1 })
    ) as unknown as SpawnAdapter;

    await expect(
      runSpecifyPrintMode('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).rejects.toThrow('authentication failed');
  });

  it('resolves cleanly on zero exit with no failure markers', async () => {
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['Specification written to specs/0013-dark-mode/spec.md'], exitCode: 0 })
    ) as unknown as SpawnAdapter;

    await expect(
      runSpecifyPrintMode('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).resolves.toBeUndefined();
  });

  it('rejects with spawn error when the process cannot be started', async () => {
    const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    const spawnFn = vi.fn(() => {
      void Promise.resolve().then(() => child.emit('error', new Error('ENOENT')));
      return child;
    }) as unknown as SpawnAdapter;

    await expect(
      runSpecifyPrintMode('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).rejects.toThrow('Failed to spawn copilot: ENOENT');
  });
});
