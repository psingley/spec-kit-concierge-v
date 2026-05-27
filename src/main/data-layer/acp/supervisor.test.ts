import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn } from 'node:child_process';
import agentsJson from '../agents/agents.json';
import { createAgentManifest } from '../agents/manifest';
import {
  AGENT_MODE_URI,
  AUTOPILOT_MODE_URI,
  AutopilotRequiresAllowError,
  ModeChangeDeferredError,
  ModelChangeInProgressError,
  PLAN_MODE_URI
} from './types';
import { BoundCLISupervisor } from './supervisor';
import { verifiedCopilotInitialize } from './capabilities.factory.spec';

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
  default: {
    spawn: spawnMock
  },
  spawn: spawnMock
}));

const manifestResult = createAgentManifest(agentsJson);
if (!manifestResult.ok) {
  throw new Error(manifestResult.error.message);
}
const copilotAgent = manifestResult.value.agents.copilot;
if (copilotAgent === undefined) {
  throw new Error('Missing Copilot manifest entry');
}

type JsonRpcMessage = {
  jsonrpc: '2.0';
  id?: string | number | null;
  method?: string;
  params?: unknown;
  result?: unknown;
};

type FakeChild = EventEmitter & {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: ReturnType<typeof vi.fn>;
  requests: JsonRpcMessage[];
  exitAs(code: number | null, signal: NodeJS.Signals | null): void;
};

const sessionNewResult = {
  sessionId: 'session-1',
  models: {
    availableModels: [
      {
        modelId: 'gpt-5.5',
        name: 'GPT-5.5',
        description: 'GPT-5.5',
        _meta: {
          copilotUsage: '7.5x',
          copilotEnablement: 'enabled'
        }
      }
    ],
    currentModelId: 'gpt-5.5'
  },
  modes: {
    availableModes: [
      { id: AGENT_MODE_URI, name: 'Agent' },
      { id: PLAN_MODE_URI, name: 'Plan' },
      { id: AUTOPILOT_MODE_URI, name: 'Autopilot' }
    ],
    currentModeId: AGENT_MODE_URI
  },
  configOptions: [
    {
      type: 'select',
      id: 'model',
      name: 'Model',
      currentValue: 'gpt-5.5',
      category: 'model',
      options: [{ value: 'gpt-5.5', name: 'GPT-5.5' }]
    }
  ]
};

const lineDelimited = (message: unknown): string => `${JSON.stringify(message)}\n`;

const createFakeChild = (
  handler: (message: JsonRpcMessage, child: FakeChild) => unknown = (message, child) => {
    switch (message.method) {
      case 'initialize':
        return verifiedCopilotInitialize;
      case 'session/new':
        return sessionNewResult;
      case 'session/prompt':
        child.stdout.write(
          lineDelimited({
            jsonrpc: '2.0',
            method: 'session/update',
            params: {
              sessionId: 'session-1',
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'hello' }
              }
            }
          })
        );
        child.stdout.write(
          lineDelimited({
            jsonrpc: '2.0',
            method: 'session/update',
            params: {
              sessionId: 'session-1',
              update: {
                sessionUpdate: 'future_update',
                value: true
              }
            }
          })
        );
        return { stopReason: 'end_turn' };
      case 'session/set_config_option':
        return { configOptions: sessionNewResult.configOptions };
      case 'session/list':
        return { sessions: [{ sessionId: 'session-1', title: 'Run 3', cwd: '/work' }] };
      case 'session/load':
        return { sessionId: 'session-1', modes: { currentModeId: AGENT_MODE_URI } };
      case 'session/cancel':
        return undefined;
      default:
        return {};
    }
  }
): FakeChild => {
  const child = new EventEmitter() as FakeChild;
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.requests = [];
  child.kill = vi.fn(() => {
    child.emit('exit', null, 'SIGTERM');
    child.stdout.end();
    return true;
  });
  child.exitAs = (code, signal) => {
    child.emit('exit', code, signal);
    child.stdout.end();
  };

  let buffer = '';
  child.stdin.on('data', (chunk) => {
    buffer += String(chunk);
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines.filter((candidate) => candidate.trim().length > 0)) {
      const message = JSON.parse(line) as JsonRpcMessage;
      child.requests.push(message);
      if (message.id === undefined || message.id === null) {
        void handler(message, child);
        continue;
      }

      const result = handler(message, child);
      if (result instanceof Promise) {
        continue;
      }
      child.stdout.write(lineDelimited({ jsonrpc: '2.0', id: message.id, result }));
    }
  });
  child.stdin.on('finish', () => {
    child.stdout.end();
    child.emit('exit', 0, null);
  });

  return child;
};

const startSession = async (
  child = createFakeChild(),
  options: Partial<ConstructorParameters<typeof BoundCLISupervisor>[0]> = {}
) => {
  vi.mocked(spawn).mockReturnValueOnce(child as never);
  const supervisor = new BoundCLISupervisor({
    agent: copilotAgent,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...options
  });

  return {
    child,
    session: await supervisor.start()
  };
};

describe('BoundCLISupervisor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts the manifest-selected Copilot CLI with ACP enabled and returns verified capabilities', async () => {
    const { child, session } = await startSession();

    expect(spawn).toHaveBeenCalledWith('copilot', ['--allow-all-tools', '--acp'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });
    expect(session.capabilities).toMatchObject({
      protocolVersion: 1,
      agent: { name: 'Copilot', version: '1.0.54' },
      agentCapabilities: {
        loadSession: true,
        listSessions: true
      }
    });

    await expect(session.dispose()).resolves.toEqual({ outcome: 'closed' });
    expect(child.kill).not.toHaveBeenCalled();
  });

  it('creates a new ACP session with cwd and MCP server parameters', async () => {
    const { child, session } = await startSession();

    await expect(
      session.newSession('/work', [{ type: 'stdio', command: 'concierge-mcp', args: [] }])
    ).resolves.toMatchObject({
      sessionId: 'session-1',
      currentModeId: AGENT_MODE_URI,
      currentModelId: 'gpt-5.5'
    });
    expect(child.requests.find((request) => request.method === 'session/new')).toMatchObject({
      params: {
        cwd: '/work',
        mcpServers: [{ type: 'stdio', command: 'concierge-mcp', args: [] }]
      }
    });
  });

  it('streams session/update notifications and ignores unknown future update kinds', async () => {
    const { session } = await startSession();
    const updates: unknown[] = [];

    const result = await session.prompt('session-1', 'hello', (update) => updates.push(update));

    expect(result.stopReason).toBe('end_turn');
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      sessionId: 'session-1',
      update: { sessionUpdate: 'agent_message_chunk' }
    });
    expect(session.state).toBe('ready');
  });

  it('uses configOptions[id=model] for model selection', async () => {
    const { child, session } = await startSession();

    await session.setModel('session-1', 'gpt-5.4');

    expect(child.requests.find((request) => request.method === 'session/set_config_option')).toMatchObject({
      params: {
        sessionId: 'session-1',
        configId: 'model',
        value: 'gpt-5.4'
      }
    });
    expect(child.requests.some((request) => request.method === 'session/set_model')).toBe(false);
  });

  it('rejects model changes while a prompt is running', async () => {
    const child = createFakeChild((message, fakeChild) => {
      if (message.method === 'session/prompt') {
        fakeChild.stdout.write(
          lineDelimited({
            jsonrpc: '2.0',
            method: 'session/update',
            params: { sessionId: 'session-1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'x' } } }
          })
        );
        return new Promise(() => undefined);
      }
      return message.method === 'initialize' ? verifiedCopilotInitialize : sessionNewResult;
    });
    const { session } = await startSession(child);
    void session.prompt('session-1', 'slow');
    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(session.setModel('session-1', 'gpt-5.4')).rejects.toBeInstanceOf(
      ModelChangeInProgressError
    );
  });

  it('defaults new sessions to Agent mode', async () => {
    const { session } = await startSession();

    await expect(session.newSession('/work', [])).resolves.toMatchObject({
      currentModeId: AGENT_MODE_URI
    });
  });

  it('requires explicit recorded allow before selecting Autopilot at startup', async () => {
    const { session } = await startSession();

    await expect(session.newSession('/work', [], { modeId: AUTOPILOT_MODE_URI })).rejects.toBeInstanceOf(
      AutopilotRequiresAllowError
    );
    await expect(
      session.newSession('/work', [], { modeId: AUTOPILOT_MODE_URI, autopilotDecision: 'allow' })
    ).resolves.toMatchObject({
      currentModeId: AUTOPILOT_MODE_URI
    });
  });

  it('defers all non-startup mode changes to future runs', async () => {
    const { session } = await startSession();

    await expect(session.setMode('session-1', PLAN_MODE_URI)).rejects.toBeInstanceOf(
      ModeChangeDeferredError
    );
  });

  it('lists sessions through ACP session/list', async () => {
    const { child, session } = await startSession();

    await expect(session.listSessions('/work')).resolves.toEqual([
      { sessionId: 'session-1', title: 'Run 3', cwd: '/work', updatedAt: undefined }
    ]);
    expect(child.requests.find((request) => request.method === 'session/list')).toMatchObject({
      params: { cwd: '/work' }
    });
  });

  it('loads sessions through ACP session/load', async () => {
    const { child, session } = await startSession();

    await expect(session.loadSession('session-1', '/work')).resolves.toEqual({
      sessionId: 'session-1',
      currentModeId: AGENT_MODE_URI
    });
    expect(child.requests.find((request) => request.method === 'session/load')).toMatchObject({
      params: { sessionId: 'session-1', cwd: '/work', mcpServers: [] }
    });
  });

  it('acknowledges cancellation without killing the child process', async () => {
    const { child, session } = await startSession();

    await expect(session.cancel('session-1')).resolves.toEqual({ outcome: 'acknowledged' });
    expect(child.requests.find((request) => request.method === 'session/cancel')).toMatchObject({
      params: { sessionId: 'session-1' }
    });
    expect(child.kill).not.toHaveBeenCalled();
    expect(session.state).toBe('ready');
  });

  it('terminates the child when cancellation does not complete within the graceful window', async () => {
    const { child, session } = await startSession(createFakeChild(), {
      setTimeoutFn: ((callback: () => void) => {
        callback();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout,
      clearTimeoutFn: vi.fn() as unknown as typeof clearTimeout
    });

    await expect(
      session.cancel('session-1')
    ).resolves.toEqual({ outcome: 'terminated' });
    expect(child.kill).toHaveBeenCalled();
  });

  it('disposes gracefully by closing streams without killing the process', async () => {
    const { child, session } = await startSession();

    await expect(session.dispose()).resolves.toEqual({ outcome: 'closed' });
    expect(session.state).toBe('closed');
    expect(child.kill).not.toHaveBeenCalled();
  });

  it('terminates the child when disposal exceeds the graceful window', async () => {
    const child = createFakeChild();
    child.stdin.removeAllListeners('finish');
    const { session } = await startSession(child, {
      setTimeoutFn: ((callback: () => void) => {
        callback();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout,
      clearTimeoutFn: vi.fn() as unknown as typeof clearTimeout
    });

    await expect(session.dispose()).resolves.toEqual({ outcome: 'terminated' });
    expect(child.kill).toHaveBeenCalled();
  });

  it('marks non-zero unexpected exits as errored, logs stderr tail, emits session-ended, and does not restart', async () => {
    const child = createFakeChild();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    vi.mocked(spawn).mockReturnValueOnce(child as never);
    const session = await new BoundCLISupervisor({ agent: copilotAgent, logger }).start();
    const ended = vi.fn();
    session.onSessionEnded(ended);

    child.stderr.write('boom');
    child.exitAs(2, null);

    expect(session.state).toBe('errored');
    expect(ended).toHaveBeenCalledWith({ code: 2, signal: null, stderrTail: 'boom' });
    expect(logger.error).toHaveBeenCalledWith(
      { code: 2, signal: null, stderrTail: 'boom' },
      'bound CLI session ended unexpectedly'
    );
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it('marks SIGSEGV exits as errored and does not restart', async () => {
    const { child, session } = await startSession();

    child.exitAs(null, 'SIGSEGV');

    expect(session.state).toBe('errored');
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it('marks SIGKILL exits as errored and does not restart', async () => {
    const { child, session } = await startSession();

    child.exitAs(null, 'SIGKILL');

    expect(session.state).toBe('errored');
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it('marks stderr-then-exit simulated crashes as errored and does not restart', async () => {
    const { child, session } = await startSession();
    const ended = vi.fn();
    session.onSessionEnded(ended);

    child.stderr.write('fatal simulated crash');
    child.exitAs(1, null);

    expect(session.state).toBe('errored');
    expect(ended).toHaveBeenCalledWith({
      code: 1,
      signal: null,
      stderrTail: 'fatal simulated crash'
    });
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it('cleans up the child process when initialize returns malformed capabilities', async () => {
    // Codex-found bug: if initialize() or capability parsing fails, the spawned
    // child was orphaned. The supervisor MUST kill the child before rejecting.
    const malformedInit = (message: JsonRpcMessage) => {
      if (message.method === 'initialize') {
        return { protocolVersion: 1, agentCapabilities: 'not-an-object' };
      }
      return {};
    };
    const child = createFakeChild(malformedInit);
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    vi.mocked(spawn).mockReturnValueOnce(child as never);

    await expect(
      new BoundCLISupervisor({ agent: copilotAgent, logger }).start()
    ).rejects.toThrow();

    // The supervisor MUST have killed the orphaned child before rejecting.
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(spawn).toHaveBeenCalledTimes(1);
  });
});
