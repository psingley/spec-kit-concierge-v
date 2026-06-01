import type { IpcMain } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { registerCopilotClarifyIpc } from './copilotClarify';

const basePayload = {
  subscriptionId: 'sub-1',
  branch: 'spec/0012-clarify-bug',
  operation: 'askAnother' as const,
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
// resolve it and read spec.md from THERE, not the repo root.
const createRepo = async (featureRel = 'specs/0012-clarify-bug'): Promise<{ repositoryPath: string; featureDir: string }> => {
  const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-clarify-repo-'));
  await mkdir(path.join(repositoryPath, '.specify'), { recursive: true });
  await mkdir(path.join(repositoryPath, featureRel), { recursive: true });
  await writeFile(path.join(repositoryPath, '.specify', 'feature.json'), JSON.stringify({ feature_directory: featureRel }), 'utf8');
  return { repositoryPath, featureDir: path.join(repositoryPath, featureRel) };
};

const clarifyQuestionSpec = `# Spec

## Clarifications

Q: Which storage backend should the cache use?
- A: In-memory
- B: Redis
`;

describe('registerCopilotClarifyIpc featureDir resolution', () => {
  it('reads clarify questions from the feature dir spec.md resolved via .specify/feature.json (not repo root)', async () => {
    const harness = createHarness();
    const { repositoryPath, featureDir } = await createRepo();
    // The question lives ONLY in the feature dir spec.md. The repo root has none.
    await writeFile(path.join(featureDir, 'spec.md'), clarifyQuestionSpec, 'utf8');

    registerCopilotClarifyIpc({
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      agentAdapter: vi.fn().mockResolvedValue(undefined)
    });

    await harness.handlers.get('copilot:clarify')?.({ sender: harness.sender }, { ...basePayload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:clarify:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'clarify', status: 'pass' })
    })));
    const done = harness.sender.send.mock.calls.find((call) => call[1].event.type === 'done')?.[1].event;
    expect(done.summary.questions).toEqual([
      expect.objectContaining({ id: 'q1', text: 'Which storage backend should the cache use?' })
    ]);
    void featureDir;
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
