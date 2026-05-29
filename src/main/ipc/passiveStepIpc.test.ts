import type { IpcMain } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { registerPassiveStepIpc } from './passiveStepIpc';

const payload = {
  subscriptionId: 'sub-1',
  repositoryPath: '/repo/specs/0008-ai-passive-steps',
  branch: 'spec/0008-ai-passive-steps',
  modelId: 'gpt-5.5'
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

describe('registerPassiveStepIpc', () => {
  it('runs before hook, agent adapter, after hook, and emits one terminal pass event', async () => {
    const harness = createHarness();
    const beforeHook = vi.fn().mockResolvedValue({ ok: true });
    const agentAdapter = vi.fn().mockResolvedValue(undefined);
    const afterHook = vi.fn().mockResolvedValue({
      ok: true,
      commit: { commitSha: 'abc123' }
    });

    registerPassiveStepIpc({
      step: 'plan',
      channel: 'copilot:plan',
      eventChannel: 'copilot:plan:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook,
      afterHook,
      agentAdapter
    });

    const ack = await harness.handlers.get('copilot:plan')?.({ sender: harness.sender }, payload);

    expect(ack).toMatchObject({ subscriptionId: 'sub-1', step: 'plan', accepted: true });
    await vi.waitFor(() => expect(afterHook).toHaveBeenCalledTimes(1));
    expect(beforeHook).toHaveBeenCalledWith(expect.objectContaining({ featureDir: payload.repositoryPath, sessionId: expect.stringMatching(/^plan-/) }));
    expect(agentAdapter).toHaveBeenCalledWith(expect.objectContaining({ step: 'plan', modelId: 'gpt-5.5' }));
    expect(harness.sender.send).toHaveBeenCalledWith('copilot:plan:event', expect.objectContaining({
      subscriptionId: 'sub-1',
      event: expect.objectContaining({ type: 'done', step: 'plan', status: 'pass', commitSha: 'abc123' })
    }));
    const terminalEvents = harness.sender.send.mock.calls.filter((call) => call[1].event.type === 'done');
    expect(terminalEvents).toHaveLength(1);
  });

  it('propagates errors as one terminal fail event and skips duplicate terminal sends', async () => {
    const harness = createHarness();

    registerPassiveStepIpc({
      step: 'tasks',
      channel: 'copilot:tasks',
      eventChannel: 'copilot:tasks:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn(),
      agentAdapter: vi.fn().mockRejectedValue(new Error('agent failed'))
    });

    await harness.handlers.get('copilot:tasks')?.({ sender: harness.sender }, payload);

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:tasks:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'tasks', status: 'fail', reason: 'agent failed' })
    })));
    const terminalEvents = harness.sender.send.mock.calls.filter((call) => call[1].event.type === 'done');
    expect(terminalEvents).toHaveLength(1);
  });

  it('sends fail without running the agent when the abort signal is already aborted', async () => {
    const harness = createHarness();
    const controller = new AbortController();
    controller.abort();
    const agentAdapter = vi.fn();

    registerPassiveStepIpc({
      step: 'analyze',
      channel: 'copilot:analyze',
      eventChannel: 'copilot:analyze:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn(),
      agentAdapter,
      abortSignal: controller.signal
    });

    await harness.handlers.get('copilot:analyze')?.({ sender: harness.sender }, payload);

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:analyze:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'analyze', status: 'fail', reason: 'aborted' })
    })));
    expect(agentAdapter).not.toHaveBeenCalled();
  });
});
