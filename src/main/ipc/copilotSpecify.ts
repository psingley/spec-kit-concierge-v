import path from 'node:path';
import { spawn as nodeSpawn } from 'node:child_process';
import type { SpawnOptions, ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { app, type IpcMain } from 'electron';
import { loadAgentManifest } from '../data-layer/agents/loader';
import { BoundCLISupervisor } from '../data-layer/acp/supervisor';
import { beforeSpecifyHook } from '../hooks/beforeSpecify.hook';
import { afterSpecifyHook } from '../hooks/afterSpecify.hook';
import type { StepHook } from '../hooks/types';
import { runGit } from '../data-layer/git/gitCommand';
import { ensureBranch as ensureBranchDefault } from '../data-layer/git/ensureBranch';
import { resolveFeatureDir } from '../data-layer/specify/featureDir';
import { reconcileSpecifyFeatureJson } from '../data-layer/specify/reconcileFeatureJson';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, toError } from './handlerUtils';
import {
  createCopilotSpecifyAck,
  createCopilotSpecifyRequest,
  createStepStreamEvent,
  type CopilotSpecifyAck,
  type CopilotSpecifyRequest,
  type StepStreamEvent
} from './copilotSpecify.factory';
import {
  createSpecifyReadinessAdapters,
  evaluateSpecifyReadiness,
  type SpecifyReadinessReport
} from './specifyReadiness';

// SpawnAdapter mirrors the subset of node:child_process.spawn used by the
// print-mode adapter, injected so tests can stub it without mocking the module.
// `pid` is needed to reap the detached process group on completion.
export type SpawnAdapter = (
  command: string,
  args: string[],
  options: SpawnOptions
) => Pick<ChildProcess, 'stdout' | 'stderr' | 'on' | 'pid'>;

// Reaps a detached process group by its leader pid. Injected so tests can spy
// on the negative-pid kill without touching real OS processes. Defaults to a
// SIGTERM-then-SIGKILL sweep of the whole group (negative pid = group).
export type KillProcessTree = (pid: number) => void;

const defaultKillProcessTree: KillProcessTree = (pid) => {
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    // Group may already be gone — reaping is best-effort and idempotent.
  }
  setTimeout(() => {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      // Already reaped.
    }
  }, 2000).unref?.();
};

export const COPILOT_SPECIFY_CHANNEL = 'copilot:specify';
export const COPILOT_SPECIFY_EVENT_CHANNEL = 'copilot:specify:event';
export const SPECIFY_READINESS_CHANNEL = 'specify:readiness';

export type SpecifyAgentAdapter = (
  request: CopilotSpecifyRequest & {
    sessionId: string;
    featureDir: string;
    // Real RFC-4122 v4 UUID handed to copilot via --session-id (the Concierge
    // sessionId is not a valid UUID and copilot rejects it — see the handler).
    copilotSessionId: string;
    // Per-run directory handed to copilot via --log-dir, keyed by Concierge id.
    logDir: string;
    // Called with each stdout line emitted by the copilot print-mode process.
    onUpdate?: (line: string) => void;
  }
) => Promise<void>;

export type SpecifyReadinessEvaluator = (request: {
  repositoryPath: string;
  modelId?: string;
}) => Promise<SpecifyReadinessReport>;

export type RegisterCopilotSpecifyIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath?: string;
  agentAdapter?: SpecifyAgentAdapter;
  evaluateReadiness?: SpecifyReadinessEvaluator;
  beforeHook?: StepHook;
  afterHook?: StepHook;
  branchReader?: (repositoryPath: string) => Promise<string>;
  reconcileFeatureJson?: typeof reconcileSpecifyFeatureJson;
  // Post-specify reconciliation: guarantee the worktree ends on a real branch
  // (Bug 25) when spec-kit's LLM-executed git.feature hook left it detached.
  ensureBranch?: (repositoryPath: string, branchName: string) => Promise<string>;
  now?: () => number;
};

// Probe live capabilities via session/new (where availableModels actually
// live) so readiness can verify a model is selectable before the ACP turn.
const probeCapabilities =
  (logger: Pick<MainLogger, 'info' | 'warn' | 'error'>, userDataPath: string) =>
  async (): Promise<{ available: string[]; current?: string }> => {
    const manifest = await loadAgentManifest(logger);
    const agent = manifest.agents.copilot;
    if (agent === undefined) {
      throw new Error('Copilot agent manifest entry is missing.');
    }
    const supervisor = new BoundCLISupervisor({ agent, logger, userDataPath });
    const session = await supervisor.start();
    try {
      const state = await session.newSession(userDataPath, []);
      return {
        available: state.availableModels.map((model) => model.id),
        current: state.currentModelId
      };
    } finally {
      await session.dispose();
    }
  };

const defaultEvaluateReadiness =
  (logger: Pick<MainLogger, 'info' | 'warn' | 'error'>, userDataPath: string): SpecifyReadinessEvaluator =>
  (request) =>
    evaluateSpecifyReadiness(
      request,
      createSpecifyReadinessAdapters({ capabilitiesProbe: probeCapabilities(logger, userDataPath) })
    );

// The agent is pinned via --agent speckit.specify, but pinning the agent alone
// is NOT enough to make it behave like a real /speckit.specify invocation: with
// a bare description in -p (e.g. "remove the fake traffic lights"), the model
// reads an imperative code-change request and — with --allow-all-tools — edits
// source/test/design files directly instead of writing a spec. We mirror how the
// command is actually driven interactively ("run speckit.specify with this
// specification: <request>") so the model frames the input as a specification to
// spec, not a task to implement. $ARGUMENTS in the agent file receives this body.
export const buildSpecifyPrompt = (featureDescription: string): string =>
  `Run /speckit.specify with this specification:\n\n${featureDescription}`;

// Known stdout/stderr markers that indicate a hard failure from the copilot CLI.
const FAILURE_MARKERS = ['Skill not found', 'error:', 'Error:'];

const containsFailureMarker = (text: string): boolean =>
  FAILURE_MARKERS.some((marker) => text.includes(marker));

// A single parsed JSONL event from copilot's --output-format json stream.
type CopilotJsonEvent = Record<string, unknown> & { type?: unknown };

// The authoritative terminal event copilot emits at end-of-turn under
// --output-format json: { type: 'result', sessionId, exitCode, usage, ... }.
type CopilotResultEvent = CopilotJsonEvent & {
  type: 'result';
  sessionId?: string;
  exitCode?: number;
  usage?: unknown;
  error?: unknown;
};

const isResultEvent = (event: CopilotJsonEvent): event is CopilotResultEvent =>
  event.type === 'result';

// What runSpecifyPrintMode resolves with so callers can log copilot's
// authoritative end-of-turn outcome (exitCode/usage) for traceability.
export type SpecifyRunOutcome = {
  exitCode: number;
  usage?: unknown;
  // copilot's own session id echoed in the result event (should equal ours).
  copilotSessionId?: string;
};

// Pull the first non-empty string from a record at any of the given keys. The
// returned value is trimmed (used for full messages / labels).
const firstString = (record: Record<string, unknown>, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

// Like firstString but preserves the raw value verbatim (no trim). Streamed
// deltas carry significant leading/trailing whitespace at token boundaries, so
// coalescing them must NOT trim or the reconstructed text loses its spaces.
const firstRawString = (record: Record<string, unknown>, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
};

// Turn a dotted event type ("session.model_change") into a friendly label
// ("session model change") for the rare unknown-event fallback — never raw JSON.
const friendlyTypeLabel = (type: string): string => type.replace(/[._]/g, ' ').trim();

// Extract the ACTUAL human-readable content from one parsed JSONL event so the
// activity stream shows the spec being written — not the bare event TYPE name.
//
// copilot's --output-format json events nest their payload under `data` (verified
// against the SDK schema session-events.schema.json and real events.jsonl runs):
//   assistant.message        → data.content        (full assistant text)
//   assistant.message_delta  → data.deltaContent   (incremental text)
//   assistant.reasoning      → data.content        (reasoning text)
//   assistant.reasoning_delta→ data.deltaContent   (incremental reasoning)
//   tool.execution_start     → data.toolName       ("Running <tool>")
//   tool.execution_complete  → data.success/result ("Finished <tool>")
//   result                   → terminal            ("Specify complete")
//   assistant.turn_end       → (no content; suppressed)
// Only when there is genuinely no text payload do we fall back to a friendly
// label derived from the event type — and never the raw JSON string.
export const readableFromEvent = (event: CopilotJsonEvent): string | undefined => {
  const type = typeof event.type === 'string' ? event.type : undefined;
  const data = isRecord(event.data) ? event.data : undefined;

  // Reasoning (full + incremental): surface as "thinking: ..." so it reads
  // distinctly from the spec text itself. Deltas keep raw whitespace.
  if (type === 'assistant.reasoning' || type === 'assistant.reasoning_delta') {
    const reasoning = data && (firstRawString(data, 'deltaContent') ?? firstString(data, 'content', 'text'));
    return reasoning !== undefined ? `thinking: ${reasoning}` : undefined;
  }

  // Assistant message (full + incremental): forward the text content directly so
  // the user watches the spec stream in. Incremental deltas keep raw whitespace
  // so coalescing them reconstructs the spec text faithfully.
  if (type === 'assistant.message' || type === 'assistant.message_delta' || type === 'assistant.message_start') {
    if (!data) {
      return undefined;
    }
    return firstRawString(data, 'deltaContent') ?? firstString(data, 'content', 'text');
  }

  // Tool lifecycle: a readable "Running <tool>" / "Finished <tool>" line.
  if (type === 'tool.execution_start' && data) {
    const toolName = firstString(data, 'toolName', 'mcpToolName', 'name');
    return toolName !== undefined ? `Running ${toolName}` : undefined;
  }
  if (type === 'tool.execution_complete' && data) {
    const toolName = firstString(data, 'toolName', 'mcpToolName', 'name');
    const succeeded = data.success !== false;
    const verb = succeeded ? 'Finished' : 'Failed';
    return toolName !== undefined ? `${verb} ${toolName}` : `${verb} tool`;
  }

  // Terminal result event: keep a terse "complete" line for the stream. The
  // authoritative exitCode/usage resolution happens separately in handleLine.
  if (type === 'result') {
    return 'Specify complete';
  }

  // turn_end carries only a turnId — nothing readable; suppress it.
  if (type === 'assistant.turn_end') {
    return undefined;
  }

  // Defensive: some lines may arrive without the `data` wrapper. Surface any
  // top-level text/content/message we can find before falling back.
  const flat = firstString(event as Record<string, unknown>, 'text', 'message', 'content');
  if (flat !== undefined) {
    return flat;
  }
  if (data) {
    const nested = firstString(data, 'deltaContent', 'content', 'text', 'message');
    if (nested !== undefined) {
      return nested;
    }
  }

  // Unknown event type with no text payload → a friendly label, never raw JSON.
  return type !== undefined && type.length > 0 ? friendlyTypeLabel(type) : undefined;
};

// Spawn copilot in print-mode with --agent flag (Option D — GitHub's documented
// deterministic agent-pinning pattern), hardened for the lingering-MCP-tree
// problem.
//
// Argv: copilot --agent speckit.specify [--model <id>] --allow-all-tools
//         --output-format json --session-id <uuid> --log-dir <perRunDir> -p "<desc>"
//   --agent speckit.specify  → pins .github/agents/speckit.specify.agent.md by filename
//   --output-format json     → JSONL stream; the terminal { type:'result' } event
//                              carries the authoritative { sessionId, exitCode, usage }
//   --session-id <uuid>      → real RFC-4122 v4 UUID so copilot's session state is
//                              addressable by our key (Concierge id is NOT a valid UUID)
//   --log-dir <perRunDir>    → copilot logs land in a dir keyed by the Concierge id
//   -p "<desc>"              → raw feature description becomes $ARGUMENTS in the agent
//   cwd = repositoryPath     → agent file resolution is relative to the target repo
//
// Resolution model:
//   • The `result` event is authoritative end-of-turn — resolve/reject on it
//     IMMEDIATELY (exitCode 0 → resolve, else reject) without waiting for 'close'.
//     'close' is laggy: lingering MCP-server grandchildren inherit the agent's
//     stdio and don't close it when the turn ends, delaying/blocking 'close'.
//   • If 'close' fires WITHOUT a result event ever arriving, fall back to the
//     exit code so we never hang when json output is absent.
//   • child.on('error') (spawn failure) always rejects.
//   • Failure-marker scan stays as a secondary signal.
//
// Reaping: the child is spawned detached (new process group) so the whole tree
// shares its PGID; on completion we kill the negative pid to sweep the lingering
// MCP grandchildren. We do NOT unref() — we manage the child's lifetime here.
export const runSpecifyPrintMode = (
  binary: string,
  launchArgs: string[],
  prompt: string,
  repositoryPath: string,
  modelId: string | undefined,
  onLine: ((line: string) => void) | undefined,
  spawnFn: SpawnAdapter,
  copilotSessionId: string,
  logDir: string,
  // Branch hint from the renderer; intentionally NOT threaded into the env. With
  // the detached-worktree model (ADR-0016) spec-kit's before_specify hook names
  // the real branch itself, so we must NOT set GIT_BRANCH_NAME and pre-empt it.
  _branchName: string | undefined,
  killProcessTree: KillProcessTree = defaultKillProcessTree
): Promise<SpecifyRunOutcome> => {
  const args = [
    '--agent', 'speckit.specify',
    ...(modelId !== undefined ? ['--model', modelId] : []),
    ...launchArgs,
    '--output-format', 'json',
    '--session-id', copilotSessionId,
    '--log-dir', logDir,
    '-p',
    prompt
  ];
  // Inherit the plain env: GIT_BRANCH_NAME is deliberately unset so spec-kit's
  // before_specify hook creates the feature-steered branch from the detached HEAD.
  const env = process.env;
  return new Promise<SpecifyRunOutcome>((resolve, reject) => {
    const child = spawnFn(binary, args, { cwd: repositoryPath, shell: false, detached: true, env });

    let failureDetail: string | undefined;
    let settled = false;
    let sawResult = false;

    // Reap the whole detached process group exactly once. Idempotent and safe
    // even if the tree is already gone.
    let reaped = false;
    const reap = (): void => {
      if (reaped) return;
      reaped = true;
      if (typeof child.pid === 'number') {
        killProcessTree(child.pid);
      }
    };

    const settle = (action: () => void): void => {
      if (settled) return;
      settled = true;
      reap();
      action();
    };

    const handleLine = (line: string): void => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return;

      // Secondary signal: keep the human-readable failure-marker scan.
      if (containsFailureMarker(trimmed) && failureDetail === undefined) {
        failureDetail = trimmed;
      }

      // Each stdout line is one JSONL event under --output-format json. Parse
      // it; surface a readable string to the activity stream; act on `result`.
      let event: CopilotJsonEvent | undefined;
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (isRecord(parsed)) {
          event = parsed as CopilotJsonEvent;
        }
      } catch {
        // Non-JSON line (human-readable progress). Forward verbatim.
      }

      if (event === undefined) {
        onLine?.(trimmed);
        return;
      }

      const readable = readableFromEvent(event);
      if (readable !== undefined) {
        onLine?.(readable);
      }

      if (isResultEvent(event)) {
        sawResult = true;
        const exitCode = typeof event.exitCode === 'number' ? event.exitCode : 0;
        if (exitCode === 0) {
          settle(() =>
            resolve({
              exitCode,
              usage: event.usage,
              copilotSessionId: typeof event.sessionId === 'string' ? event.sessionId : undefined
            })
          );
        } else {
          const detail =
            failureDetail ??
            (typeof event.error === 'string' ? event.error : `copilot result exitCode ${String(exitCode)}`);
          settle(() => reject(new Error(`Copilot specify failed: ${detail}`)));
        }
      }
    };

    // Buffer partial lines across chunks for both stdout and stderr.
    let stdoutBuf = '';
    let stderrBuf = '';

    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdoutBuf += String(chunk);
      const lines = stdoutBuf.split('\n');
      stdoutBuf = lines.pop() ?? '';
      for (const line of lines) handleLine(line);
    });

    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderrBuf += String(chunk);
      const lines = stderrBuf.split('\n');
      stderrBuf = lines.pop() ?? '';
      for (const line of lines) {
        if (containsFailureMarker(line) && failureDetail === undefined) {
          failureDetail = line.trim();
        }
      }
    });

    child.on('close', (code: number | null) => {
      // Flush any remaining buffered output (may contain the result event).
      if (stdoutBuf.trim().length > 0) handleLine(stdoutBuf);
      if (stderrBuf.trim().length > 0 && containsFailureMarker(stderrBuf) && failureDetail === undefined) {
        failureDetail = stderrBuf.trim();
      }
      // If the result event already settled us, this is a no-op (settle guards).
      // Otherwise fall back to the exit code so we never hang when json output
      // is absent (sawResult stays false).
      if (sawResult) {
        reap();
        return;
      }
      if (code !== 0) {
        const detail = failureDetail ?? `copilot exited with code ${String(code)}`;
        settle(() => reject(new Error(`Copilot specify failed: ${detail}`)));
        return;
      }
      if (failureDetail !== undefined) {
        settle(() => reject(new Error(`Copilot specify failed: ${failureDetail}`)));
        return;
      }
      settle(() => resolve({ exitCode: code ?? 0 }));
    });

    child.on('error', (err: Error) => {
      settle(() => reject(new Error(`Failed to spawn copilot: ${err.message}`)));
    });
  });
};

const defaultAgentAdapter =
  (logger: Pick<MainLogger, 'info' | 'warn' | 'error'>, userDataPath: string, spawnFn: SpawnAdapter = nodeSpawn): SpecifyAgentAdapter =>
async (request) => {
  const manifest = await loadAgentManifest(logger);
  const agent = manifest.agents.copilot;
  if (agent === undefined) {
    throw new Error('Copilot agent manifest entry is missing.');
  }
  const outcome = await runSpecifyPrintMode(
    agent.binary,
    agent.launchArgs,
    buildSpecifyPrompt(request.prompt),
    request.repositoryPath,
    request.modelId,
    request.onUpdate,
    spawnFn,
    request.copilotSessionId,
    request.logDir,
    request.branch
  );
  // Completion binding: copilot's authoritative end-of-turn outcome keyed by our
  // copilot session id (ids/usage only — no PII).
  logger.info(
    {
      channel: COPILOT_SPECIFY_CHANNEL,
      copilotSessionId: request.copilotSessionId,
      exitCode: outcome.exitCode,
      usage: outcome.usage
    },
    'specify agent result'
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const registerCopilotSpecifyIpc = ({
  ipcMain,
  logger,
  userDataPath = app.getPath('userData'),
  agentAdapter = defaultAgentAdapter(logger, userDataPath),
  evaluateReadiness = defaultEvaluateReadiness(logger, userDataPath),
  beforeHook = beforeSpecifyHook,
  afterHook = afterSpecifyHook,
  // Read the WORKTREE's current branch AFTER spec-kit's after-hook has named it.
  // `branch --show-current` is run with cwd=repositoryPath (the worktree), i.e.
  // equivalent to `git -C <worktreePath> branch --show-current`; it returns the
  // real spec-kit-named branch (empty only on a still-detached HEAD).
  branchReader = (repositoryPath) => runGit(repositoryPath, ['branch', '--show-current']),
  reconcileFeatureJson = reconcileSpecifyFeatureJson,
  ensureBranch = ensureBranchDefault,
  now = () => performance.now()
}: RegisterCopilotSpecifyIpcOptions): void => {
  ipcMain.handle(COPILOT_SPECIFY_CHANNEL, async (event, ...args: unknown[]): Promise<CopilotSpecifyAck> => {
    const startedAt = now();
    const context = getSenderContext(event);
    const request = createCopilotSpecifyRequest(assertOnePayload(COPILOT_SPECIFY_CHANNEL, args));
    if (!request.ok) {
      throw toError(request.error.message);
    }

    const sessionId = `specify-${Date.now().toString(36)}`;
    // copilot rejects non-UUID --session-id values, so keep the Concierge id
    // (sessionId) and copilot's session id SEPARATE and map between them. logDir
    // is keyed by the Concierge id so our logs and copilot's are co-addressable.
    const copilotSessionId = randomUUID();
    const logDir = path.join(userDataPath, 'copilot-logs', sessionId);
    const ack = createCopilotSpecifyAck({
      subscriptionId: request.value.subscriptionId,
      sessionId,
      step: 'specify',
      accepted: true
    });
    if (!ack.ok) {
      throw toError(ack.error.message);
    }

    const sendEvent = (streamEvent: StepStreamEvent): void => {
      const parsed = createStepStreamEvent(streamEvent);
      if (!parsed.ok) {
        logger.error({ channel: COPILOT_SPECIFY_CHANNEL, context, success: false, error: parsed.error }, 'ipc handler invocation');
        return;
      }
      event.sender.send(COPILOT_SPECIFY_EVENT_CHANNEL, {
        subscriptionId: request.value.subscriptionId,
        event: parsed.value
      });
    };

    const run = async (): Promise<void> => {
      let terminalSent = false;
      const terminal = (streamEvent: Extract<StepStreamEvent, { type: 'done' }>): void => {
        if (terminalSent) {
          return;
        }
        terminalSent = true;
        sendEvent(streamEvent);
      };
      // Resolve against the repo root for the before-hook; the real feature directory
      // is discovered from .specify/feature.json after spec-kit has run.
      const artifactPath = 'spec.md';
      try {
        sendEvent({
          type: 'progress',
          step: 'specify',
          sessionId,
          level: 'info',
          message: 'Preparing Specify lifecycle',
          timestamp: new Date().toISOString()
        });
        // Readiness preflight: verify every precondition BEFORE firing the ACP
        // turn so an unmet condition (e.g. no model selected) blocks honestly
        // instead of firing-and-hanging into the escape-hatch path.
        const readiness = await evaluateReadiness({
          repositoryPath: request.value.repositoryPath,
          modelId: request.value.modelId
        });
        logger.info(
          { channel: SPECIFY_READINESS_CHANNEL, context, checks: readiness.checks, ready: readiness.ready },
          'ipc handler invocation'
        );
        if (!readiness.ready) {
          const reason = readiness.failingCheck?.detail ?? 'Specify preconditions are not met.';
          terminal({ type: 'done', step: 'specify', sessionId, status: 'fail', reason });
          logger.error(
            { channel: SPECIFY_READINESS_CHANNEL, context, success: false, ready: false, failingCheck: readiness.failingCheck?.name },
            'ipc handler invocation'
          );
          return;
        }
        const before = await beforeHook({
          repositoryPath: request.value.repositoryPath,
          featureDir: request.value.repositoryPath,
          sessionId,
          userDataPath,
          authStatus: { githubLoggedIn: true, copilotLoggedIn: true }
        });
        if (!before.ok) {
          throw new Error(before.escapeHatchReason);
        }
        sendEvent({
          type: 'progress',
          step: 'specify',
          sessionId,
          level: 'info',
          message: 'Sending prompt to Copilot',
          timestamp: new Date().toISOString()
        });
        // Ensure copilot's per-run --log-dir exists before spawn, then log the
        // Concierge↔copilot session binding for traceability (ids/paths only — no PII).
        await mkdir(logDir, { recursive: true });
        logger.info(
          {
            channel: COPILOT_SPECIFY_CHANNEL,
            conciergeSessionId: sessionId,
            copilotSessionId,
            logDir,
            repositoryPath: request.value.repositoryPath
          },
          'specify agent spawn'
        );
        const featureJsonBaseRef = await runGit(request.value.repositoryPath, ['rev-parse', 'HEAD']).catch(() => undefined);
        await agentAdapter({
          ...request.value,
          sessionId,
          featureDir: request.value.repositoryPath,
          copilotSessionId,
          logDir,
          onUpdate: (line) => {
            sendEvent({
              type: 'progress',
              step: 'specify',
              sessionId,
              level: 'info',
              message: line,
              timestamp: new Date().toISOString()
            });
          }
        });
        await reconcileFeatureJson({
          repositoryPath: request.value.repositoryPath,
          logger,
          branchName: request.value.branch,
          baseRef: featureJsonBaseRef
        });
        // Reconcile .specify/feature.json before resolving the feature directory
        // so the after-hook and artifact read use the spec.md path the agent wrote.
        const featureDir = await resolveFeatureDir(request.value.repositoryPath);
        const after = await afterHook({
          repositoryPath: request.value.repositoryPath,
          featureDir,
          sessionId,
          userDataPath,
          authStatus: { githubLoggedIn: true, copilotLoggedIn: true }
        });
        if (!after.ok || after.commit?.commitSha === undefined) {
          const reason = after.ok
            ? 'missing commit sha'
            : after.error instanceof Error
              ? `${after.escapeHatchReason}: ${after.error.message}`
              : after.escapeHatchReason;
          throw new Error(reason);
        }
        const specMarkdown = await import('node:fs/promises').then((fs) =>
          fs.readFile(path.join(featureDir, artifactPath), 'utf8')
        );
        // Read the branch spec-kit's after-hook named. EMPTY (or a throw) means
        // the worktree is on a DETACHED HEAD — spec-kit's LLM-executed
        // before_specify git.feature hook (git checkout -b NNN-slug) sometimes
        // doesn't run (Bug 25). Reconcile by deriving the feature branch name
        // from the resolved feature dir basename and creating+switching the
        // worktree onto it, so the done event always carries a real branch and
        // downstream steps (which gate on branch !== null) unblock.
        let branch = await branchReader(request.value.repositoryPath).catch(() => undefined);
        if (branch !== undefined && branch.length === 0) {
          branch = await ensureBranch(request.value.repositoryPath, path.basename(featureDir));
        }
        terminal({
          type: 'done',
          step: 'specify',
          sessionId,
          status: 'pass',
          specMarkdown,
          artifactPath,
          commitSha: after.commit.commitSha,
          ...(branch !== undefined ? { branch } : {})
        });
        logger.info({ channel: COPILOT_SPECIFY_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      } catch (error) {
        terminal({
          type: 'done',
          step: 'specify',
          sessionId,
          status: 'fail',
          reason: error instanceof Error ? error.message : String(error)
        });
        logHandlerError(logger, { channel: COPILOT_SPECIFY_CHANNEL, context, startedAt, now }, error);
      }
    };

    void run();
    return ack.value;
  });
};
