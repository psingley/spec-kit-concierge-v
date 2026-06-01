import path from 'node:path';
import { spawn as nodeSpawn } from 'node:child_process';
import type { SpawnOptions, ChildProcess } from 'node:child_process';
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
export type SpawnAdapter = (
  command: string,
  args: string[],
  options: SpawnOptions
) => Pick<ChildProcess, 'stdout' | 'stderr' | 'on'>;

export const COPILOT_SPECIFY_CHANNEL = 'copilot:specify';
export const COPILOT_SPECIFY_EVENT_CHANNEL = 'copilot:specify:event';
export const SPECIFY_READINESS_CHANNEL = 'specify:readiness';

export type SpecifyAgentAdapter = (
  request: CopilotSpecifyRequest & {
    sessionId: string;
    featureDir: string;
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

// Spawn copilot in print-mode with --agent flag (Option D — GitHub's documented
// deterministic agent-pinning pattern).
//
// Argv: copilot --agent speckit.specify [--model <id>] --allow-all-tools -p "<desc>"
//   --agent speckit.specify  → pins .github/agents/speckit.specify.agent.md by filename
//   -p "<desc>"              → raw feature description becomes $ARGUMENTS in the agent
//   cwd = repositoryPath     → agent file resolution is relative to the target repo
//
// Live-unverified assumptions (user to smoke-test):
//   1. Dotted --agent name `speckit.specify` resolves correctly (docs show hyphenated
//      examples; verify `copilot --agent speckit.specify -p "test"` in the target repo).
//   2. --output-format json is confirmed in --help (JSONL, one JSON object per line).
//      Forwarding as raw lines; if JSON, upstream consumers see structured text.
//   3. copilot -p exits non-zero when the agent workflow fails.
//   4. spec-kit's agent writes .specify/feature.json identically via --agent as it
//      does via interactive mode (resolveFeatureDir depends on this).
export const runSpecifyPrintMode = (
  binary: string,
  launchArgs: string[],
  prompt: string,
  repositoryPath: string,
  modelId: string | undefined,
  onLine: ((line: string) => void) | undefined,
  spawnFn: SpawnAdapter
): Promise<void> => {
  const args = [
    '--agent', 'speckit.specify',
    ...(modelId !== undefined ? ['--model', modelId] : []),
    ...launchArgs,
    '-p',
    prompt
  ];
  return new Promise<void>((resolve, reject) => {
    const child = spawnFn(binary, args, { cwd: repositoryPath, shell: false });
    let failureDetail: string | undefined;

    const handleLine = (line: string): void => {
      if (line.trim().length === 0) return;
      onLine?.(line);
      if (containsFailureMarker(line) && failureDetail === undefined) {
        failureDetail = line.trim();
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
      // Flush any remaining buffered output.
      if (stdoutBuf.trim().length > 0) handleLine(stdoutBuf);
      if (stderrBuf.trim().length > 0 && containsFailureMarker(stderrBuf) && failureDetail === undefined) {
        failureDetail = stderrBuf.trim();
      }
      if (code !== 0) {
        const detail = failureDetail ?? `copilot exited with code ${String(code)}`;
        reject(new Error(`Copilot specify failed: ${detail}`));
        return;
      }
      if (failureDetail !== undefined) {
        reject(new Error(`Copilot specify failed: ${failureDetail}`));
        return;
      }
      resolve();
    });

    child.on('error', (err: Error) => {
      reject(new Error(`Failed to spawn copilot: ${err.message}`));
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
  await runSpecifyPrintMode(
    agent.binary,
    agent.launchArgs,
    buildSpecifyPrompt(request.prompt),
    request.repositoryPath,
    request.modelId,
    request.onUpdate,
    spawnFn
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
        await agentAdapter({
          ...request.value,
          sessionId,
          featureDir: request.value.repositoryPath,
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
