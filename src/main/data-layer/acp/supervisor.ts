import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AgentManifestEntry } from '../agents/manifest';
import { resolveWindowsBinary } from '../auth/execGh';
import type { MainLogger } from '../../logging';
import type { BoundCLISession, CodingAgent } from './agent';
import { createBoundCLICapabilities, parseBoundCLIConfigOptions, parseModels, parseModes } from './capabilities';
import { createAcpProtocol, type AcpProtocol, type AcpTranscriptRecord } from './protocol';
import {
  AGENT_MODE_URI,
  AUTOPILOT_MODE_URI,
  AutopilotRequiresAllowError,
  ModeChangeDeferredError,
  ModelChangeInProgressError,
  type BoundCLICancelResult,
  type BoundCLICapabilities,
  type BoundCLICrashInfo,
  type BoundCLIDisposeResult,
  type BoundCLILifecycleState,
  type BoundCLILoadSessionResult,
  type BoundCLIMcpServer,
  type BoundCLINewSessionOptions,
  type BoundCLINewSessionResult,
  type BoundCLIPromptResult,
  type BoundCLIPromptUpdate,
  type BoundCLISessionId,
  type BoundCLISessionSummary
} from './types';
import { writeAcpTranscript } from './transcript';

export type BoundCLISupervisorOptions = {
  agent: AgentManifestEntry;
  logger?: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath?: string;
  now?: () => Date;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
  // Opt-in environment override for the spawned ACP process. When undefined the
  // child inherits the parent process env unchanged (passive steps rely on this).
  // When provided it is merged onto process.env so callers (e.g. clarify) can pin
  // SPECIFY_FEATURE without dropping inherited PATH/HOME/etc.
  env?: Record<string, string>;
};

type SpawnedBoundCLI = ChildProcess & {
  stdin: NodeJS.WritableStream | null;
  stdout: NodeJS.ReadableStream | null;
  stderr: NodeJS.ReadableStream | null;
};

const cancellationWindowMs = 5_000;
const stderrTailLimit = 4 * 1024;

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const raceWithTimeout = async <T>(
  work: Promise<T>,
  timeoutMs: number,
  setTimeoutFn: typeof setTimeout,
  clearTimeoutFn: typeof clearTimeout
): Promise<T | 'timeout'> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timeoutHandle = setTimeoutFn(() => resolve('timeout'), timeoutMs);
  });

  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeoutFn(timeoutHandle);
    }
  }
};

class LiveBoundCLISession implements BoundCLISession {
  readonly capabilities: BoundCLICapabilities;
  readonly events = new EventEmitter();
  #state: BoundCLILifecycleState = 'ready';
  #sessionId: string | undefined;
  #expectedClose = false;
  #stderrTail = '';
  #updates: BoundCLIPromptUpdate[] = [];
  #promptUpdateListener: ((update: BoundCLIPromptUpdate) => void) | undefined;

  constructor(
    capabilities: BoundCLICapabilities,
    private readonly child: SpawnedBoundCLI,
    private readonly protocol: AcpProtocol,
    private readonly transcriptRecords: AcpTranscriptRecord[],
    private readonly options: Required<
      Pick<BoundCLISupervisorOptions, 'now' | 'setTimeoutFn' | 'clearTimeoutFn'>
    > &
      Pick<BoundCLISupervisorOptions, 'logger' | 'userDataPath'>
  ) {
    this.capabilities = capabilities;
    this.child.stderr?.on('data', (chunk: Buffer | string) => {
      this.#stderrTail = `${this.#stderrTail}${String(chunk)}`.slice(-stderrTailLimit);
    });
    this.child.once('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      if (this.#expectedClose) {
        return;
      }

      this.#state = 'errored';
      const info: BoundCLICrashInfo = {
        code,
        signal,
        stderrTail: this.#stderrTail
      };
      this.options.logger?.error({ ...info }, 'bound CLI session ended unexpectedly');
      this.events.emit('session-ended', info);
    });
  }

  get state(): BoundCLILifecycleState {
    return this.#state;
  }

  handleSessionUpdate = (params: unknown): void => {
    const record = toRecord(params);
    const sessionId = typeof record.sessionId === 'string' ? record.sessionId : (this.#sessionId ?? '');
    const rawUpdate = toRecord(record.update);
    const update = { sessionId, update: rawUpdate };
    this.#updates.push(update);
    this.#promptUpdateListener?.(update);
  };

  onSessionEnded(listener: (info: unknown) => void): () => void {
    this.events.on('session-ended', listener);
    return () => this.events.off('session-ended', listener);
  }

  async newSession(
    cwd: string,
    mcpServers: BoundCLIMcpServer[],
    options: BoundCLINewSessionOptions = {}
  ): Promise<BoundCLINewSessionResult> {
    const modeId = options.modeId ?? AGENT_MODE_URI;
    if (modeId === AUTOPILOT_MODE_URI && options.autopilotDecision !== 'allow') {
      throw new AutopilotRequiresAllowError();
    }

    const result = toRecord(await this.protocol.newSession({ cwd, mcpServers }));
    const sessionId = typeof result.sessionId === 'string' ? result.sessionId : '';
    this.#sessionId = sessionId;
    this.#state = 'ready';
    await this.writeTranscript(sessionId, options.step ?? 'session-new');

    // ACP capture proved availableModels/availableModes live on session/new
    // (SessionModelState), not on initialize. Parse them here so callers (e.g.
    // the probe) can populate the otherwise-empty capabilities lists.
    const parsedModes = parseModes(result.modes);
    const parsedModels = parseModels(result.models);
    const currentModeId = options.modeId ?? parsedModes.current;
    const currentModelId = parsedModels.current ?? this.capabilities.models.current;

    return {
      sessionId,
      currentModeId,
      currentModelId,
      availableModels: parsedModels.available,
      availableModes: parsedModes.available,
      configOptions: parseBoundCLIConfigOptions(result.configOptions)
    };
  }

  async prompt(
    sessionId: BoundCLISessionId,
    text: string,
    onUpdate?: (update: BoundCLIPromptUpdate) => void
  ): Promise<BoundCLIPromptResult> {
    this.#sessionId = sessionId;
    this.#state = 'prompting';
    const start = this.#updates.length;
    this.#promptUpdateListener = onUpdate;
    let result: Record<string, unknown>;
    try {
      result = toRecord(await this.protocol.prompt({ sessionId, text }));
    } finally {
      this.#promptUpdateListener = undefined;
    }
    const updates = this.#updates.slice(start);
    this.#state = 'ready';
    await this.writeTranscript(sessionId, 'prompt');

    return {
      stopReason: typeof result.stopReason === 'string' ? result.stopReason : 'unknown',
      updates
    };
  }

  async setModel(sessionId: BoundCLISessionId, modelId: string): Promise<void> {
    if (this.#state === 'pending' || this.#state === 'prompting') {
      throw new ModelChangeInProgressError();
    }

    await this.protocol.setSessionConfigOption({ sessionId, configId: 'model', value: modelId });
  }

  async setMode(): Promise<void> {
    throw new ModeChangeDeferredError();
  }

  async listSessions(cwd?: string): Promise<BoundCLISessionSummary[]> {
    const result = toRecord(await this.protocol.listSessions({ cwd }));
    const sessions = Array.isArray(result.sessions) ? result.sessions : [];

    return sessions.flatMap((session): BoundCLISessionSummary[] => {
      const record = toRecord(session);
      if (typeof record.sessionId !== 'string') {
        return [];
      }

      return [
        {
          sessionId: record.sessionId,
          title: typeof record.title === 'string' ? record.title : undefined,
          cwd: typeof record.cwd === 'string' ? record.cwd : undefined,
          updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined
        }
      ];
    });
  }

  async loadSession(sessionId: BoundCLISessionId, cwd: string): Promise<BoundCLILoadSessionResult> {
    const result = toRecord(await this.protocol.loadSession({ sessionId, cwd }));
    this.#sessionId = sessionId;
    this.#state = 'ready';
    const modes = toRecord(result.modes);

    return {
      sessionId,
      currentModeId: typeof modes.currentModeId === 'string' ? modes.currentModeId : undefined
    };
  }

  async cancel(sessionId: BoundCLISessionId): Promise<BoundCLICancelResult> {
    this.#state = 'cancelling';
    const outcome = await raceWithTimeout(
      this.protocol.cancel({ sessionId }),
      cancellationWindowMs,
      this.options.setTimeoutFn,
      this.options.clearTimeoutFn
    );

    if (outcome === 'timeout') {
      this.child.kill();
      this.#state = 'closed';
      return { outcome: 'terminated' };
    }

    this.#state = 'ready';
    await this.writeTranscript(sessionId, 'cancel');
    return { outcome: 'acknowledged' };
  }

  async dispose(): Promise<BoundCLIDisposeResult> {
    if (this.#state === 'closed') {
      return { outcome: 'closed' };
    }

    this.#expectedClose = true;
    this.child.stdin?.end();
    const outcome = await raceWithTimeout(
      this.protocol.close(),
      cancellationWindowMs,
      this.options.setTimeoutFn,
      this.options.clearTimeoutFn
    );

    if (outcome === 'timeout') {
      this.child.kill();
      this.#state = 'closed';
      return { outcome: 'terminated' };
    }

    this.#state = 'closed';
    return { outcome: 'closed' };
  }

  private async writeTranscript(sessionId: string, step: string): Promise<void> {
    if (this.options.userDataPath === undefined) {
      return;
    }

    await writeAcpTranscript({
      userDataPath: this.options.userDataPath,
      sessionId,
      step,
      timestamp: this.options.now(),
      records: this.transcriptRecords.map((record) => ({
        direction: record.direction,
        ...record.message
      }))
    });
  }
}

class TestAcpAdapterSession implements BoundCLISession {
  readonly capabilities: BoundCLICapabilities = {
    protocolVersion: 1,
    agent: { name: 'test-acp-adapter', title: 'Test ACP Adapter', version: '0.0.0' },
    agentCapabilities: {
      loadSession: false,
      listSessions: false,
      mcp: { http: false, sse: false },
      prompt: { image: false, audio: false, embeddedContext: false }
    },
    authMethods: [],
    modes: { current: AGENT_MODE_URI, available: [{ id: AGENT_MODE_URI, name: 'Agent' }] },
    models: {
      current: 'claude-sonnet-4-5',
      available: [{ id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', enablement: 'default' }]
    },
    configOptions: []
  };
  readonly events = new EventEmitter();
  readonly state: BoundCLILifecycleState = 'ready';
  #cwd = '';

  async newSession(cwd: string): Promise<BoundCLINewSessionResult> {
    this.#cwd = cwd;
    return {
      sessionId: 'test-acp-session',
      currentModeId: AGENT_MODE_URI,
      currentModelId: this.capabilities.models.current,
      availableModels: this.capabilities.models.available,
      availableModes: this.capabilities.modes.available,
      configOptions: this.capabilities.configOptions
    };
  }

  async prompt(_sessionId: BoundCLISessionId, text: string): Promise<BoundCLIPromptResult> {
    const delayMs = Number.parseInt(process.env.CONCIERGE_TEST_ACP_PROMPT_DELAY_MS ?? '0', 10);
    if (Number.isFinite(delayMs) && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await mkdir(this.#cwd, { recursive: true });
    if (text.includes('/speckit.clarify') || text.includes('Ask exactly one additional clarification question') || text.includes('Rewrite only malformed Clarify question')) {
      const clarifyMarkdown = text.includes('Ask exactly one additional clarification question')
        ? `## Clarifications

Q: Should the new flow gracefully degrade on poor connectivity (offline retry, queued submit)?
- A: Yes - queue submits and retry up to 3x over 5 minutes
- B: No - fail-fast with a Try again prompt
`
        : text.includes('Rewrite only malformed Clarify question')
          ? `## Clarifications

Q: Which policy owns award-ticket eligibility?
- A: loyalty-ledger
- B: rebook-rules
`
          : `## Clarifications

Q: When the new fare is lower than the original, how should the difference be handled?
- A: Refund the difference to original payment method
- B: Issue future-travel credit at face value
- C: Hold credit at the original fare; no refund

Q: For companion travelers on a Platinum-tier booking, should the change apply to everyone on the PNR or only the booking owner?
- A: Always change all travelers on the PNR
- B: Default to all, with explicit opt-out per leg
- C: Owner only, prompt to add companions separately
`;
      await writeFile(path.join(this.#cwd, 'spec.md'), clarifyMarkdown, 'utf8');
      return { stopReason: 'complete', updates: [] };
    }

    const specMarkdown = text.includes('flight-change flow') || text.includes('loyalty-tier guests')
      ? `# Self-serve flight-change for loyalty guests

## Problem
Loyalty-tier guests currently must call the concierge desk to change a flight inside the ±48h departure window. This bottlenecks the desk during weather events and leaves guests waiting on hold an average of 8 minutes. The mobile app should let them self-serve when rebook rules are met.

## Goals
- Reduce desk volume for in-window changes by **60%** in Q3.
- Maintain **<1.5s** rebook search latency at p95.
- Keep guest-facing failure rate **under 0.5%**.
- No regression to existing supplier-side rebook contracts.

## Non-goals
- New-bookings flow (out of scope).
- Multi-leg itineraries with >2 connecting flights.
- Loyalty-tier upgrades from inside the change flow.

## User stories
1. As a Gold-tier guest, I can open my itinerary and tap "Change flight" to see eligible alternatives.
2. As a Platinum-tier guest, I can change a flight for myself **and** linked travel companions in one transaction.
3. As an ops agent, I can see in the dashboard which self-serve changes hit the manual-review queue and why.

## Acceptance criteria
- [ ] Eligibility check runs in <200ms p95 against rebook-rules service.
- [ ] Alternatives list is sorted by fare-difference, then departure delta.
- [ ] Confirmation receipt is delivered via guest-app push **and** email within 30s.
- [ ] Failed transactions roll back the itinerary-service write atomically.
- [ ] Audit event is written to loyalty-ledger for every successful change.

## Dependencies
| System              | Owner          | Contract        |
|---------------------|----------------|-----------------|
| rebook-rules svc    | @booking-team  | gRPC v3         |
| itinerary-service   | @ops-platform  | REST v2 + SQS   |
| loyalty-ledger      | @loyalty       | append-only log |
| guest-app push      | @mobile        | FCM topic       |

## Out of scope clarifications needed
> The following ambiguities will be resolved in the next step.

- Refund handling when new fare is lower
- Eligibility for award-ticket bookings
- Behavior when companion-traveler bookings span tiers
- Whether change quotas reset on cancel-and-rebook
- Offline / poor-connection retry policy

## Open risks
- Supplier API throttling during weather events could push us over the latency budget. We may need to pre-warm caches.
- Loyalty-ledger throughput has not been load-tested above 80 events/sec; in-window change spikes could exceed that.

## Notes
This spec was drafted by Copilot CLI from the provided prompt and grounded against existing repo conventions found in \`concierge-api\` and \`booking-engine\`. See the activity stream for the full evidence chain.

---

*End of spec — scroll-through complete unlocks the Clarify step.*







`
      : `# Hello-world feature

Prompt: ${text}

This specification was generated by the Run 6 Specify adapter.
`;
    await writeFile(
      path.join(this.#cwd, 'spec.md'),
      specMarkdown,
      'utf8'
    );
    return { stopReason: 'complete', updates: [] };
  }

  async setModel(): Promise<void> {}

  async setMode(): Promise<void> {}

  async listSessions(): Promise<BoundCLISessionSummary[]> {
    return [];
  }

  async loadSession(sessionId: BoundCLISessionId): Promise<BoundCLILoadSessionResult> {
    return { sessionId, currentModeId: AGENT_MODE_URI };
  }

  async cancel(): Promise<BoundCLICancelResult> {
    return { outcome: 'acknowledged' };
  }

  async dispose(): Promise<BoundCLIDisposeResult> {
    return { outcome: 'closed' };
  }

  onSessionEnded(): () => void {
    return () => {};
  }
}

export class BoundCLISupervisor implements CodingAgent {
  constructor(private readonly options: BoundCLISupervisorOptions) {}

  async start(): Promise<BoundCLISession> {
    if (process.env.CONCIERGE_TEST_ACP_ADAPTER !== undefined) {
      return new TestAcpAdapterSession();
    }

    const launchArgs = [
      ...this.options.agent.launchArgs,
      ...(this.options.agent.acpModeFlag === null ? [] : [this.options.agent.acpModeFlag])
    ];
    const spawnOptions: SpawnOptions = {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      // Inherit parent env by default (unchanged behavior). Only merge an override
      // when one is supplied so passive-step spawns are unaffected.
      env: this.options.env === undefined ? process.env : { ...process.env, ...this.options.env }
    };
    const binary = await resolveWindowsBinary(this.options.agent.binary);
    const child = spawn(binary, launchArgs, spawnOptions) as SpawnedBoundCLI;

    if (child.stdin === null || child.stdout === null || child.stderr === null) {
      throw new Error('Bound CLI process did not expose stdio pipes.');
    }

    const transcriptRecords: AcpTranscriptRecord[] = [];
    const sessionRef: { current?: LiveBoundCLISession } = {};
    const protocol = createAcpProtocol({
      stdin: child.stdin,
      stdout: child.stdout,
      client: {
        onSessionUpdate: (params) => sessionRef.current?.handleSessionUpdate(params),
        record: (record) => {
          transcriptRecords.push(record);
        }
      }
    });

    // Codex-found bug: if initialize() or capability parsing fails, the spawned
    // child was orphaned. Wrap init+parse in try/catch that kills the child
    // before re-throwing.
    let rawCapabilities: unknown;
    try {
      rawCapabilities = await protocol.initialize();
    } catch (initError) {
      child.kill();
      throw initError;
    }
    const capabilityResult = createBoundCLICapabilities(rawCapabilities);
    if (!capabilityResult.ok) {
      child.kill();
      throw new Error(capabilityResult.error.message);
    }

    const session = new LiveBoundCLISession(capabilityResult.value, child, protocol, transcriptRecords, {
      logger: this.options.logger,
      userDataPath: this.options.userDataPath,
      now: this.options.now ?? (() => new Date()),
      setTimeoutFn: this.options.setTimeoutFn ?? setTimeout,
      clearTimeoutFn: this.options.clearTimeoutFn ?? clearTimeout
    });
    sessionRef.current = session;

    if (this.options.userDataPath !== undefined) {
      await writeAcpTranscript({
        userDataPath: this.options.userDataPath,
        sessionId: 'initialize',
        step: 'initialize',
        timestamp: this.options.now?.() ?? new Date(),
        records: transcriptRecords.map((record) => ({
          direction: record.direction,
          ...record.message
        }))
      });
    }

    this.options.logger?.info(
      {
        binary: this.options.agent.binary,
        launchArgs,
        success: true
      },
      'bound CLI supervisor started'
    );

    return session;
  }
}
