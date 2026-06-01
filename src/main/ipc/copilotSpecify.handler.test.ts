import type { IpcMain } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { registerCopilotSpecifyIpc } from './copilotSpecify';

const basePayload = {
  subscriptionId: 'sub-1',
  branch: 'spec/0012-remove-fake-traffic-lights',
  prompt: 'Remove the fake traffic lights from the dashboard',
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

const okBefore = vi.fn().mockResolvedValue({ ok: true });
const okAfter = vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'sha-123' } });

describe('registerCopilotSpecifyIpc featureDir resolution', () => {
  it('resolves the feature directory from .specify/feature.json and reads spec.md from there (not repo root)', async () => {
    const harness = createHarness();
    const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-specify-repo-'));
    const featureRel = 'specs/0012-remove-fake-traffic-lights';
    await mkdir(path.join(repositoryPath, '.specify'), { recursive: true });
    await mkdir(path.join(repositoryPath, featureRel), { recursive: true });
    await writeFile(path.join(repositoryPath, '.specify', 'feature.json'), JSON.stringify({ feature_directory: featureRel }), 'utf8');
    // spec lives ONLY in the feature dir, not the repo root.
    await writeFile(path.join(repositoryPath, featureRel, 'spec.md'), '# Real spec\nFrom feature dir', 'utf8');

    const afterHook = vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'sha-123' } });

    registerCopilotSpecifyIpc({
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      evaluateReadiness: vi.fn().mockResolvedValue({ ready: true, checks: [{ name: 'copilot-authed', ok: true, detail: 'ok' }] }),
      beforeHook: okBefore,
      afterHook,
      agentAdapter: vi.fn().mockResolvedValue(undefined)
    });

    await harness.handlers.get('copilot:specify')?.({ sender: harness.sender }, { ...basePayload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:specify:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'specify', status: 'pass', specMarkdown: '# Real spec\nFrom feature dir', commitSha: 'sha-123' })
    })));
    // after hook must validate against the resolved feature dir, not the repo root.
    expect(afterHook).toHaveBeenCalledWith(expect.objectContaining({ featureDir: path.join(repositoryPath, featureRel) }));
  });

  it('fails with a clear honest error when .specify/feature.json is missing', async () => {
    const harness = createHarness();
    const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-specify-nofj-'));

    registerCopilotSpecifyIpc({
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      evaluateReadiness: vi.fn().mockResolvedValue({ ready: true, checks: [{ name: 'copilot-authed', ok: true, detail: 'ok' }] }),
      beforeHook: okBefore,
      afterHook: okAfter,
      agentAdapter: vi.fn().mockResolvedValue(undefined)
    });

    await harness.handlers.get('copilot:specify')?.({ sender: harness.sender }, { ...basePayload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:specify:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'specify', status: 'fail', reason: expect.stringContaining('.specify/feature.json') })
    })));
  });
});

describe('registerCopilotSpecifyIpc streaming', () => {
  it('forwards agent stdout lines to the activity stream as progress events', async () => {
    const harness = createHarness();
    const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-specify-stream-'));
    const featureRel = 'specs/0012-x';
    await mkdir(path.join(repositoryPath, '.specify'), { recursive: true });
    await mkdir(path.join(repositoryPath, featureRel), { recursive: true });
    await writeFile(path.join(repositoryPath, '.specify', 'feature.json'), JSON.stringify({ feature_directory: featureRel }), 'utf8');
    await writeFile(path.join(repositoryPath, featureRel, 'spec.md'), '# spec', 'utf8');

    const agentAdapter = vi.fn(async (request: { onUpdate?: (line: string) => void }) => {
      request.onUpdate?.('Creating feature directory...');
      request.onUpdate?.('Writing spec.md to specs/0012-x/spec.md');
    });

    registerCopilotSpecifyIpc({
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      evaluateReadiness: vi.fn().mockResolvedValue({ ready: true, checks: [{ name: 'copilot-authed', ok: true, detail: 'ok' }] }),
      beforeHook: okBefore,
      afterHook: okAfter,
      agentAdapter
    });

    await harness.handlers.get('copilot:specify')?.({ sender: harness.sender }, { ...basePayload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:specify:event', expect.objectContaining({
      event: expect.objectContaining({
        type: 'progress',
        step: 'specify',
        message: 'Creating feature directory...'
      })
    })));
    expect(agentAdapter).toHaveBeenCalledWith(expect.objectContaining({ onUpdate: expect.any(Function) }));
  });
});

// RFC-4122 v4 UUID shape — copilot rejects the non-UUID Concierge sessionId, so
// the handler must mint a real UUID for --session-id and map the two.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('registerCopilotSpecifyIpc session correlation', () => {
  it('mints a UUID copilotSessionId + per-run logDir, threads them to the adapter, and logs the binding', async () => {
    const harness = createHarness();
    const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-specify-corr-'));
    const featureRel = 'specs/0012-corr';
    await mkdir(path.join(repositoryPath, '.specify'), { recursive: true });
    await mkdir(path.join(repositoryPath, featureRel), { recursive: true });
    await writeFile(path.join(repositoryPath, '.specify', 'feature.json'), JSON.stringify({ feature_directory: featureRel }), 'utf8');
    await writeFile(path.join(repositoryPath, featureRel, 'spec.md'), '# spec', 'utf8');

    const userData = await mkdtemp(path.join(os.tmpdir(), 'concierge-specify-userdata-'));
    const agentAdapter = vi.fn().mockResolvedValue(undefined);

    registerCopilotSpecifyIpc({
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: userData,
      evaluateReadiness: vi.fn().mockResolvedValue({ ready: true, checks: [{ name: 'copilot-authed', ok: true, detail: 'ok' }] }),
      beforeHook: okBefore,
      afterHook: okAfter,
      agentAdapter
    });

    await harness.handlers.get('copilot:specify')?.({ sender: harness.sender }, { ...basePayload, repositoryPath });

    await vi.waitFor(() => expect(agentAdapter).toHaveBeenCalledTimes(1));

    // The adapter receives a UUID-shaped copilotSessionId + a logDir keyed by the
    // Concierge sessionId (which is NOT a UUID).
    const call = agentAdapter.mock.calls[0]?.[0] as { copilotSessionId: string; logDir: string; sessionId: string };
    expect(call.copilotSessionId).toMatch(UUID_V4);
    expect(call.sessionId).not.toMatch(UUID_V4);
    expect(call.logDir).toContain(call.sessionId);
    expect(call.logDir).toContain('copilot-logs');

    // The spawn binding is logged with both ids + logDir (ids/paths only — no PII).
    expect(harness.logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'copilot:specify',
        conciergeSessionId: call.sessionId,
        copilotSessionId: call.copilotSessionId,
        logDir: call.logDir,
        repositoryPath
      }),
      'specify agent spawn'
    );
  });
});
