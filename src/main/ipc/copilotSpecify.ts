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
import { readBranchState } from '../data-layer/git/branchState';
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

// The feature description is passed verbatim as the -p prompt arg.
// The agent is pinned deterministically via --agent speckit.specify (GitHub's
// documented headless mechanism) — NOT via a slash command in the prompt text.
// $ARGUMENTS in the agent file receives the raw description directly.
export const buildSpecifyPrompt = (featureDescription: string): string =>
  featureDescription;

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

// Best-effort: pull a human-readable string out of one JSONL event for the
// activity stream. Falls back to the event type so the renderer still shows
// meaningful progress ("Streaming specify output") rather than raw JSON.
const readableFromEvent = (event: CopilotJsonEvent): string | undefined => {
  const text = event.text;
  if (typeof text === 'string' && text.trim().length > 0) {
    return text.trim();
  }
  const message = event.message;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim();
  }
  // Assistant turns commonly carry { content: [{ type:'text', text }] } or a
  // nested message object — surface the first text fragment we can find.
  if (isRecord(message)) {
    const nestedText = message.text ?? message.content;
    if (typeof nestedText === 'string' && nestedText.trim().length > 0) {
      return nestedText.trim();
    }
  }
  if (typeof event.type === 'string' && event.type.length > 0) {
    return event.type;
  }
  return undefined;
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
  return new Promise<SpecifyRunOutcome>((resolve, reject) => {
    const child = spawnFn(binary, args, { cwd: repositoryPath, shell: false, detached: true });

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
    request.logDir
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

// Spec Kit writes the spec to the feature directory recorded in .specify/feature.json
// (key feature_directory, relative to the repo root), not the repo root itself.
const resolveFeatureDir = async (repositoryPath: string): Promise<string> => {
  const fs = await import('node:fs/promises');
  const manifestPath = path.join(repositoryPath, '.specify', 'feature.json');
  let raw: string;
  try {
    raw = await fs.readFile(manifestPath, 'utf8');
  } catch {
    throw new Error('spec-kit feature directory not found (.specify/feature.json missing)');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('spec-kit feature directory unreadable (.specify/feature.json is malformed JSON)');
  }
  if (!isRecord(parsed) || typeof parsed.feature_directory !== 'string' || parsed.feature_directory.trim().length === 0) {
    throw new Error('spec-kit feature directory missing (.specify/feature.json has no feature_directory)');
  }
  return path.join(repositoryPath, parsed.feature_directory);
};

export const registerCopilotSpecifyIpc = ({
  ipcMain,
  logger,
  userDataPath = app.getPath('userData'),
  agentAdapter = defaultAgentAdapter(logger, userDataPath),
  evaluateReadiness = defaultEvaluateReadiness(logger, userDataPath),
  beforeHook = beforeSpecifyHook,
  afterHook = afterSpecifyHook,
  branchReader = async (repositoryPath) => (await readBranchState(repositoryPath)).branch,
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
        // spec-kit has now created/updated .specify/feature.json; resolve the real
        // feature directory so both the artifact read and the after-hook use it.
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
        const branch = await branchReader(request.value.repositoryPath).catch(() => undefined);
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
