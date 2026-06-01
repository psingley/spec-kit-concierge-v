import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { buildSpecifyPrompt, runSpecifyPrintMode, type SpawnAdapter } from './copilotSpecify';

// RFC-4122 v4 UUID shape (variant bits 8/9/a/b) — used to assert --session-id
// is a real UUID, since copilot rejects the non-UUID Concierge sessionId.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Shared fixtures threaded through the post-spawn args (copilotSessionId, logDir).
const FAKE_UUID = '11111111-1111-4111-8111-111111111111';
const FAKE_LOGDIR = '/tmp/user/copilot-logs/specify-abc';
// Repo-relative feature dir pinned on the spawn env as SPECIFY_FEATURE_DIRECTORY.
const FAKE_FEATURE_DIR = 'specs/012-my-feature';

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
  pid?: number;
  // When false, the child never emits 'close' (proves the result event alone
  // resolves the promise without waiting for the laggy 'close').
  emitClose?: boolean;
};

/**
 * Returns a minimal EventEmitter-based fake that mimics a spawned ChildProcess.
 * Resolves synchronously on the next tick so tests don't need to await I/O.
 */
const makeFakeChild = ({
  stdoutLines = [],
  stderrLines = [],
  exitCode = 0,
  pid = 4242,
  emitClose = true
}: FakeChildOptions = {}) => {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; pid: number };
  child.stdout = stdout;
  child.stderr = stderr;
  child.pid = pid;

  // Emit data + close on the next microtask tick so the caller has time to
  // attach listeners first.
  void Promise.resolve().then(() => {
    for (const line of stdoutLines) {
      stdout.emit('data', Buffer.from(line + '\n'));
    }
    for (const line of stderrLines) {
      stderr.emit('data', Buffer.from(line + '\n'));
    }
    if (emitClose) {
      child.emit('close', exitCode);
    }
  });

  return child;
};

// Calls runSpecifyPrintMode with the post-spawn correlation args + an optional
// kill spy, so existing 7-arg call sites stay readable.
const run = (
  binary: string,
  launchArgs: string[],
  prompt: string,
  repositoryPath: string,
  modelId: string | undefined,
  onLine: ((line: string) => void) | undefined,
  spawnFn: SpawnAdapter,
  killSpy?: (pid: number) => void,
  branchName?: string
) =>
  runSpecifyPrintMode(
    binary,
    launchArgs,
    prompt,
    repositoryPath,
    modelId,
    onLine,
    spawnFn,
    FAKE_UUID,
    FAKE_LOGDIR,
    branchName,
    FAKE_FEATURE_DIR,
    killSpy
  );

// A single JSONL result event line.
const resultLine = (exitCode: number, extra: Record<string, unknown> = {}): string =>
  JSON.stringify({ type: 'result', sessionId: FAKE_UUID, exitCode, usage: { inputTokens: 10 }, ...extra });

// ---------------------------------------------------------------------------
// runSpecifyPrintMode — spawn argv
// ---------------------------------------------------------------------------

describe('runSpecifyPrintMode spawn argv', () => {
  it('pins the agent via --agent flag and passes raw description to -p (no slash prefix)', async () => {
    const spawnFn = vi.fn(() => makeFakeChild({ stdoutLines: [resultLine(0)] })) as unknown as SpawnAdapter;

    await run('copilot', ['--allow-all-tools'], 'My feature', '/work/repo', undefined, undefined, spawnFn);

    expect(spawnFn).toHaveBeenCalledWith(
      'copilot',
      [
        '--agent', 'speckit.specify',
        '--allow-all-tools',
        '--output-format', 'json',
        '--session-id', FAKE_UUID,
        '--log-dir', FAKE_LOGDIR,
        '-p', 'My feature'
      ],
      expect.objectContaining({ cwd: '/work/repo', shell: false, detached: true })
    );
  });

  it('argv does NOT contain a /speckit.specify slash prefix in the -p value', async () => {
    const spawnFn = vi.fn(() => makeFakeChild({ stdoutLines: [resultLine(0)] })) as unknown as SpawnAdapter;

    await run('copilot', ['--allow-all-tools'], 'My feature', '/work/repo', undefined, undefined, spawnFn);

    const [, argv] = (spawnFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string[]];
    const pIdx = argv.indexOf('-p');
    expect(pIdx).toBeGreaterThan(-1);
    expect(argv[pIdx + 1]).toBe('My feature');
    expect(argv[pIdx + 1]).not.toMatch(/^\/speckit/);
  });

  it('argv includes --output-format json, a UUID-shaped --session-id, and a --log-dir', async () => {
    const spawnFn = vi.fn(() => makeFakeChild({ stdoutLines: [resultLine(0)] })) as unknown as SpawnAdapter;

    await run('copilot', ['--allow-all-tools'], 'My feature', '/work/repo', undefined, undefined, spawnFn);

    const [, argv] = (spawnFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string[]];
    const ofIdx = argv.indexOf('--output-format');
    expect(ofIdx).toBeGreaterThan(-1);
    expect(argv[ofIdx + 1]).toBe('json');

    const sidIdx = argv.indexOf('--session-id');
    expect(sidIdx).toBeGreaterThan(-1);
    expect(argv[sidIdx + 1]).toMatch(UUID_V4);

    const ldIdx = argv.indexOf('--log-dir');
    expect(ldIdx).toBeGreaterThan(-1);
    expect(argv[ldIdx + 1]).toBe(FAKE_LOGDIR);
  });

  it('inserts --model <id> after --agent and before launchArgs when modelId is provided', async () => {
    const spawnFn = vi.fn(() => makeFakeChild({ stdoutLines: [resultLine(0)] })) as unknown as SpawnAdapter;

    await run('copilot', ['--allow-all-tools'], 'My feature', '/work/repo', 'gpt-5.5', undefined, spawnFn);

    expect(spawnFn).toHaveBeenCalledWith(
      'copilot',
      [
        '--agent', 'speckit.specify',
        '--model', 'gpt-5.5',
        '--allow-all-tools',
        '--output-format', 'json',
        '--session-id', FAKE_UUID,
        '--log-dir', FAKE_LOGDIR,
        '-p', 'My feature'
      ],
      expect.objectContaining({ cwd: '/work/repo', shell: false, detached: true })
    );
  });

  it('sets cwd to the repositoryPath, not process.cwd()', async () => {
    const spawnFn = vi.fn(() => makeFakeChild({ stdoutLines: [resultLine(0)] })) as unknown as SpawnAdapter;

    await run('copilot', [], 'my feature', '/target/repo', undefined, undefined, spawnFn);

    const [, , opts] = (spawnFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string[], { cwd: string }];
    expect(opts.cwd).toBe('/target/repo');
  });

  it('does NOT inject GIT_BRANCH_NAME — spec-kit names the branch itself from the detached HEAD', async () => {
    const spawnFn = vi.fn(() => makeFakeChild({ stdoutLines: [resultLine(0)] })) as unknown as SpawnAdapter;
    const before = process.env.GIT_BRANCH_NAME;

    await run('copilot', [], 'my feature', '/target/repo', undefined, undefined, spawnFn, undefined, '003-add-dark-mode');

    const [, , opts] = (spawnFn as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string[],
      { env: Record<string, string | undefined> }
    ];
    // Even when a branch hint is threaded in, it must NOT become GIT_BRANCH_NAME:
    // the worktree is detached and spec-kit's before_specify hook owns naming.
    expect(opts.env.GIT_BRANCH_NAME).toBe(before);
  });

  it('pins SPECIFY_FEATURE_DIRECTORY on the spawn env so the agent writes spec.md + feature.json to it', async () => {
    const spawnFn = vi.fn(() => makeFakeChild({ stdoutLines: [resultLine(0)] })) as unknown as SpawnAdapter;

    await run('copilot', [], 'my feature', '/target/repo', undefined, undefined, spawnFn);

    const [, , opts] = (spawnFn as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string[],
      { env: Record<string, string | undefined> }
    ];
    expect(opts.env.SPECIFY_FEATURE_DIRECTORY).toBe(FAKE_FEATURE_DIR);
  });
});

// ---------------------------------------------------------------------------
// runSpecifyPrintMode — stdout streaming
// ---------------------------------------------------------------------------

describe('runSpecifyPrintMode stdout streaming', () => {
  it('forwards non-JSON stdout lines verbatim to onLine', async () => {
    const lines: string[] = [];
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['Creating feature directory...', 'Writing spec.md'] })
    ) as unknown as SpawnAdapter;

    await run(
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

    await run(
      'copilot', ['--allow-all-tools'], 'my feature', '/repo', undefined,
      (line) => lines.push(line),
      spawnFn
    );

    expect(lines).toEqual(['Meaningful output']);
  });

  it('surfaces a readable string (assistant text / event type) from JSONL events — not raw JSON', async () => {
    const lines: string[] = [];
    const spawnFn = vi.fn(() =>
      makeFakeChild({
        stdoutLines: [
          JSON.stringify({ type: 'assistant', text: 'Creating feature directory...' }),
          JSON.stringify({ type: 'tool_use' }),
          resultLine(0)
        ]
      })
    ) as unknown as SpawnAdapter;

    await run(
      'copilot', ['--allow-all-tools'], 'my feature', '/repo', undefined,
      (line) => lines.push(line),
      spawnFn
    );

    // Assistant text extracted; an unknown type surfaces a friendly label
    // (underscores → spaces); no raw JSON leaks. (Real tool events are
    // tool.execution_start/_complete — covered in copilotSpecify.readable.test.ts.)
    expect(lines).toContain('Creating feature directory...');
    expect(lines).toContain('tool use');
    for (const line of lines) {
      expect(line).not.toMatch(/^\{/);
    }
  });
});

// ---------------------------------------------------------------------------
// runSpecifyPrintMode — result-event resolution (FIX A)
// ---------------------------------------------------------------------------

describe('runSpecifyPrintMode result-event resolution', () => {
  it('resolves on a JSONL result event with exitCode 0 WITHOUT a close event', async () => {
    const spawnFn = vi.fn(() =>
      // emitClose:false proves the result event alone settles the promise.
      makeFakeChild({ stdoutLines: [resultLine(0)], emitClose: false })
    ) as unknown as SpawnAdapter;

    await expect(
      run('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).resolves.toMatchObject({ exitCode: 0, copilotSessionId: FAKE_UUID });
  });

  it('rejects on a result event with non-zero exitCode, carrying the detail', async () => {
    const spawnFn = vi.fn(() =>
      makeFakeChild({
        stdoutLines: [resultLine(2, { error: 'agent workflow aborted' })],
        emitClose: false
      })
    ) as unknown as SpawnAdapter;

    await expect(
      run('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).rejects.toThrow('agent workflow aborted');
  });

  it('closes WITHOUT a result event still resolves via exit-code fallback (no hang)', async () => {
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['some non-json progress'], exitCode: 0 })
    ) as unknown as SpawnAdapter;

    await expect(
      run('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).resolves.toMatchObject({ exitCode: 0 });
  });

  it('closes WITHOUT a result event rejects via exit-code fallback when non-zero', async () => {
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['some non-json progress'], exitCode: 1 })
    ) as unknown as SpawnAdapter;

    await expect(
      run('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).rejects.toThrow('Copilot specify failed');
  });
});

// ---------------------------------------------------------------------------
// runSpecifyPrintMode — process-group reaping (FIX B)
// ---------------------------------------------------------------------------

describe('runSpecifyPrintMode process-group reaping', () => {
  it('reaps the process group (negative pid) on result-event resolution', async () => {
    const killSpy = vi.fn();
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: [resultLine(0)], pid: 5150, emitClose: false })
    ) as unknown as SpawnAdapter;

    await run('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn, killSpy);

    expect(killSpy).toHaveBeenCalledWith(5150);
  });

  it('reaps the process group on close-fallback completion', async () => {
    const killSpy = vi.fn();
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['plain'], exitCode: 0, pid: 9001 })
    ) as unknown as SpawnAdapter;

    await run('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn, killSpy);

    expect(killSpy).toHaveBeenCalledWith(9001);
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
      run('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).rejects.toThrow('Copilot specify failed');
  });

  it('includes "Skill not found" detail in the rejection when present in stdout', async () => {
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['Skill not found: speckit.specify'], exitCode: 1 })
    ) as unknown as SpawnAdapter;

    await expect(
      run('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).rejects.toThrow('Skill not found: speckit.specify');
  });

  it('rejects when stdout contains a failure marker even if exit code is 0', async () => {
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['Error: something went wrong'], exitCode: 0 })
    ) as unknown as SpawnAdapter;

    await expect(
      run('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).rejects.toThrow('Copilot specify failed');
  });

  it('rejects when stderr contains a failure marker', async () => {
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stderrLines: ['error: authentication failed'], exitCode: 1 })
    ) as unknown as SpawnAdapter;

    await expect(
      run('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).rejects.toThrow('authentication failed');
  });

  it('resolves cleanly on zero exit with no failure markers', async () => {
    const spawnFn = vi.fn(() =>
      makeFakeChild({ stdoutLines: ['Specification written to specs/0013-dark-mode/spec.md'], exitCode: 0 })
    ) as unknown as SpawnAdapter;

    await expect(
      run('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).resolves.toMatchObject({ exitCode: 0 });
  });

  it('rejects with spawn error when the process cannot be started', async () => {
    const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; pid: number };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.pid = 1234;
    const spawnFn = vi.fn(() => {
      void Promise.resolve().then(() => child.emit('error', new Error('ENOENT')));
      return child;
    }) as unknown as SpawnAdapter;

    await expect(
      run('copilot', [], 'my feature', '/repo', undefined, undefined, spawnFn)
    ).rejects.toThrow('Failed to spawn copilot: ENOENT');
  });
});
