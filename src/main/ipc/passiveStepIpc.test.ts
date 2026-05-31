import type { IpcMain } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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
    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:plan:event', expect.objectContaining({
      subscriptionId: 'sub-1',
      event: expect.objectContaining({ type: 'done', step: 'plan', status: 'pass', commitSha: 'abc123' })
    })));
    const terminalEvents = harness.sender.send.mock.calls.filter((call) => call[1].event.type === 'done');
    expect(terminalEvents).toHaveLength(1);
  });

  it('discovers present optional plan artifacts for the pass summary without requiring missing optionals', async () => {
    const harness = createHarness();
    const featureDir = await mkdtemp(path.join(os.tmpdir(), 'concierge-plan-summary-'));
    await mkdir(path.join(featureDir, 'contracts'));
    await writeFile(path.join(featureDir, 'data-model.md'), '# Data model');
    await writeFile(path.join(featureDir, 'contracts', 'clarify-api.md'), '# Contract');

    registerPassiveStepIpc({
      step: 'plan',
      channel: 'copilot:plan',
      eventChannel: 'copilot:plan:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'abc123' } }),
      agentAdapter: vi.fn().mockResolvedValue(undefined)
    });

    await harness.handlers.get('copilot:plan')?.({ sender: harness.sender }, { ...payload, repositoryPath: featureDir });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:plan:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'plan', status: 'pass' })
    })));
    const done = harness.sender.send.mock.calls.find((call) => call[1].event.type === 'done')?.[1].event;
    expect(done.summary.artifacts).toEqual([
      expect.objectContaining({ path: 'plan.md', required: true }),
      expect.objectContaining({ path: 'research.md', required: true }),
      expect.objectContaining({ path: 'data-model.md', required: false }),
      expect.objectContaining({ path: 'contracts/clarify-api.md', required: false })
    ]);
    expect(done.summary.counts).toMatchObject({ required: 2, optional: 2, present: 4 });
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

  it('captures analyze terminal report evidence after the analyze commit exists', async () => {
    const harness = createHarness();
    const userDataPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-analyze-evidence-'));
    const featureDir = await mkdtemp(path.join(os.tmpdir(), '0009-review-evidence-'));

    registerPassiveStepIpc({
      step: 'analyze',
      channel: 'copilot:analyze',
      eventChannel: 'copilot:analyze:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath,
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'analyze-sha' } }),
      agentAdapter: vi.fn().mockResolvedValue({
        updates: [
          { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '# Analyze\nNo issues found.' } } }
        ]
      })
    });

    await harness.handlers.get('copilot:analyze')?.({ sender: harness.sender }, { ...payload, repositoryPath: featureDir });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:analyze:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'analyze', status: 'pass', commitSha: 'analyze-sha' })
    })));
    const featureKey = path.basename(featureDir);
    await expect(readFile(path.join(userDataPath, 'evidence', featureKey, 'analyze-report-index.json'), 'utf8'))
      .resolves.toContain('"analyzeCommitSha": "analyze-sha"');
  });

  it('forwards fine-grained ACP updates as progress events so stream silence resets live', async () => {
    const harness = createHarness();

    registerPassiveStepIpc({
      step: 'analyze',
      channel: 'copilot:analyze',
      eventChannel: 'copilot:analyze:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'analyze-sha' } }),
      agentAdapter: vi.fn(async (request) => {
        request.onUpdate?.({ sessionId: 's1', update: { sessionUpdate: 'tool_call_update', toolCallId: 't1' } });
        return { updates: [] };
      })
    });

    await harness.handlers.get('copilot:analyze')?.({ sender: harness.sender }, payload);

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:analyze:event', expect.objectContaining({
      event: expect.objectContaining({
        type: 'progress',
        step: 'analyze',
        message: 'Streaming analyze output',
        raw: { sessionId: 's1', update: { sessionUpdate: 'tool_call_update', toolCallId: 't1' } }
      })
    })));
  });
});
