import type { IpcMain } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { registerCopilotClarifyIpc, type ClarifyAgentAdapter, type ClarifySupervisorFactory } from './copilotClarify';
import type { BoundCLIPromptUpdate } from '../data-layer/acp/types';

const basePayload = {
  subscriptionId: 'sub-1',
  branch: 'spec/0012-clarify-bug',
  operation: 'next' as const,
  modelId: 'gpt-5.5',
  answers: []
};

const createHarness = () => {
  const handlers = new Map<string, (event: { sender: { id: number; send: ReturnType<typeof vi.fn> } }, payload: unknown) => Promise<unknown>>();
  const ipcMain = {
    handle: vi.fn((channel: string, handler: (event: { sender: { id: number; send: ReturnType<typeof vi.fn> } }, payload: unknown) => Promise<unknown>) => {
      handlers.set(channel, handler);
    })
  };
  const sender = { id: 7, send: vi.fn() };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { handlers, ipcMain: ipcMain as unknown as Pick<IpcMain, 'handle'>, sender, logger };
};

// spec-kit records the real feature dir in .specify/feature.json; the handler must
// resolve it before invoking the agent.
const createRepo = async (featureRel = 'specs/0012-clarify-bug'): Promise<{ repositoryPath: string; featureDir: string }> => {
  const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-clarify-repo-'));
  await mkdir(path.join(repositoryPath, '.specify'), { recursive: true });
  await mkdir(path.join(repositoryPath, featureRel), { recursive: true });
  await writeFile(path.join(repositoryPath, '.specify', 'feature.json'), JSON.stringify({ feature_directory: featureRel }), 'utf8');
  return { repositoryPath, featureDir: path.join(repositoryPath, featureRel) };
};

const agentTableMessage = `**Recommended:** Option A - matches existing rebook contracts.

Which storage backend should the cache use?

| Option | Description |
|--------|-------------|
| A | In-memory |
| B | Redis |
| Short | Provide a different short answer (<=5 words) |

You can reply with the option letter (e.g., "A"), accept the recommendation by saying "yes", or provide your own short answer.`;

const chunk = (text: string): BoundCLIPromptUpdate => ({
  sessionId: 'acp-1',
  update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } }
});

describe('registerCopilotClarifyIpc question surfacing (next path)', () => {
  it('parses the streamed agent option table into the done summary questions', async () => {
    const harness = createHarness();
    const { repositoryPath } = await createRepo();
    // The adapter streams the agent's question table via onUpdate (simulating
    // agent_message_chunk), exactly as the live adapter does.
    const agentAdapter: ClarifyAgentAdapter = vi.fn(async () => ({ message: agentTableMessage }));

    registerCopilotClarifyIpc({
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      agentAdapter
    });

    await harness.handlers.get('copilot:clarify')?.({ sender: harness.sender }, { ...basePayload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:clarify:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'clarify', status: 'pass' })
    })));
    const done = harness.sender.send.mock.calls.find((call) => call[1].event.type === 'done')?.[1].event;
    expect(done.summary.questions).toEqual([
      expect.objectContaining({
        id: 'q1',
        text: 'Which storage backend should the cache use?',
        choices: [
          { key: 'A', label: 'In-memory' },
          { key: 'B', label: 'Redis' }
        ]
      })
    ]);
  });

  it('emits a terminal fail (does not hang) when .specify/feature.json is missing', async () => {
    const harness = createHarness();
    const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-clarify-nofj-'));
    const agentAdapter = vi.fn();

    registerCopilotClarifyIpc({
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      agentAdapter
    });

    await harness.handlers.get('copilot:clarify')?.({ sender: harness.sender }, { ...basePayload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:clarify:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'clarify', status: 'fail', reason: expect.stringContaining('.specify/feature.json') })
    })));
    expect(agentAdapter).not.toHaveBeenCalled();
  });
});

describe('registerCopilotClarifyIpc session continuity (default adapter)', () => {
  // A stub supervisor + session lets us assert the default adapter re-uses the
  // SAME live ACP session on answer/commit by prompting the in-Map supervisor
  // directly (NOT loadSession, which throws "already loaded" on a live session),
  // and that the answer prompt text is well-formed.
  const buildStubSupervisor = () => {
    const calls = {
      newSession: 0,
      loadSession: [] as Array<{ sessionId: string; cwd: string }>,
      prompts: [] as string[],
      disposed: 0
    };
    const session = {
      capabilities: {} as never,
      state: 'ready' as const,
      onSessionEnded: () => () => {},
      newSession: vi.fn(async () => {
        calls.newSession += 1;
        return { sessionId: 'acp-session-1', currentModeId: 'agent', currentModelId: 'm', availableModels: [], availableModes: [], configOptions: [] };
      }),
      prompt: vi.fn(async (_sessionId: string, text: string, onUpdate?: (u: BoundCLIPromptUpdate) => void) => {
        calls.prompts.push(text);
        onUpdate?.(chunk(agentTableMessage));
        return { stopReason: 'end_turn', updates: [] };
      }),
      setModel: vi.fn(async () => {}),
      setMode: vi.fn(async () => {}),
      listSessions: vi.fn(async () => []),
      loadSession: vi.fn(async (sessionId: string, cwd: string) => {
        calls.loadSession.push({ sessionId, cwd });
        return { sessionId, currentModeId: 'agent' };
      }),
      cancel: vi.fn(async () => ({ outcome: 'acknowledged' as const })),
      dispose: vi.fn(async () => {
        calls.disposed += 1;
        return { outcome: 'closed' as const };
      })
    };
    const factoryEnvs: Array<Record<string, string> | undefined> = [];
    const supervisorFactory: ClarifySupervisorFactory = async (options) => {
      factoryEnvs.push(options?.env);
      return { start: async () => session };
    };
    return { calls, session, supervisorFactory, factoryEnvs };
  };

  it('creates the clarify supervisor with SPECIFY_FEATURE (basename) and SPECIFY_FEATURE_DIRECTORY (repo-relative) env', async () => {
    const harness = createHarness();
    const { repositoryPath } = await createRepo('specs/012-remove-faux-traffic-lights');
    const { factoryEnvs, supervisorFactory } = buildStubSupervisor();

    registerCopilotClarifyIpc({
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      supervisorFactory
    });

    await harness.handlers.get('copilot:clarify')!({ sender: harness.sender }, { ...basePayload, repositoryPath, operation: 'next' });
    await vi.waitFor(() => expect(factoryEnvs.length).toBe(1));
    expect(factoryEnvs[0]).toEqual({
      SPECIFY_FEATURE: '012-remove-faux-traffic-lights',
      SPECIFY_FEATURE_DIRECTORY: 'specs/012-remove-faux-traffic-lights'
    });
  });

  it('prompts the live ACP session on answer WITHOUT calling loadSession (regression: "already loaded")', async () => {
    const harness = createHarness();
    const { repositoryPath } = await createRepo('specs/0042-continuity');
    const { calls, supervisorFactory } = buildStubSupervisor();

    registerCopilotClarifyIpc({
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      supervisorFactory
    });

    const handler = harness.handlers.get('copilot:clarify')!;

    // next -> newSession, no loadSession, session persisted (not disposed).
    await handler({ sender: harness.sender }, { ...basePayload, repositoryPath, operation: 'next' });
    await vi.waitFor(() => expect(calls.newSession).toBe(1));
    expect(calls.loadSession).toHaveLength(0);
    expect(calls.disposed).toBe(0);

    // answer -> prompt the SAME live session directly, no new newSession, and crucially
    // NO loadSession (the live in-Map session is already loaded; loadSession would throw).
    harness.sender.send.mockClear();
    await handler({ sender: harness.sender }, {
      ...basePayload,
      repositoryPath,
      operation: 'answer',
      answers: [{ questionId: 'q1', selectedChoiceKey: 'A', shortAnswer: '' }]
    });
    await vi.waitFor(() => expect(calls.prompts.length).toBe(2));
    expect(calls.loadSession).toHaveLength(0);
    expect(calls.newSession).toBe(1);
    const answerPrompt = calls.prompts[calls.prompts.length - 1]!;
    expect(answerPrompt).toContain('Q1: A');
  });

  it('disposes the ACP session only after commit WITHOUT loadSession and emits a terminal done', async () => {
    const harness = createHarness();
    const { repositoryPath } = await createRepo('specs/0043-commit');
    const { calls, supervisorFactory } = buildStubSupervisor();

    registerCopilotClarifyIpc({
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      supervisorFactory
    });

    const handler = harness.handlers.get('copilot:clarify')!;
    await handler({ sender: harness.sender }, { ...basePayload, repositoryPath, operation: 'next' });
    await vi.waitFor(() => expect(calls.newSession).toBe(1));
    expect(calls.disposed).toBe(0);

    harness.sender.send.mockClear();
    await handler({ sender: harness.sender }, {
      ...basePayload,
      repositoryPath,
      operation: 'commit',
      answers: [{ questionId: 'q1', selectedChoiceKey: 'B', shortAnswer: '' }]
    });
    // Commit prompts the live session (no loadSession) then disposes it. The featureDir
    // is not a git repo here, so afterClarifyHook fails -> terminal done/fail (no hang).
    await vi.waitFor(() => expect(calls.disposed).toBe(1));
    expect(calls.loadSession).toHaveLength(0);
    const done = harness.sender.send.mock.calls.find((call) => call[1].event.type === 'done')?.[1].event;
    expect(done).toBeDefined();
    expect(['pass', 'fail']).toContain(done.status);
  });
});
