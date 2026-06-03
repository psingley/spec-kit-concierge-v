import { EventEmitter } from 'node:events';
import type { IpcMain } from 'electron';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentManifest } from '../data-layer/agents/manifest';
import { resolveWindowsBinary } from '../data-layer/auth/execGh';
import {
  COPILOT_SPECIFY_CHANNEL,
  COPILOT_SPECIFY_EVENT_CHANNEL,
  registerCopilotSpecifyIpc,
  type SpawnAdapter
} from './copilotSpecify';

vi.mock('../data-layer/agents/loader', () => ({
  loadAgentManifest: vi.fn(async (): Promise<AgentManifest> => ({
    version: 1,
    agents: {
      copilot: {
        displayName: 'GitHub Copilot',
        binary: 'copilot',
        launchArgs: ['--allow-all-tools'],
        acpModeFlag: null,
        capabilities: ['text', 'tools'],
        modelSelectionStrategy: 'unstable_setSessionModel|restart',
        defaultModel: null
      }
    }
  }))
}));

vi.mock('../data-layer/auth/execGh', () => ({
  resolveWindowsBinary: vi.fn(async (name: string): Promise<string> =>
    name === 'copilot' ? 'C:\\Users\\monalisa\\AppData\\Local\\GitHubCopilot\\copilot.exe' : name
  )
}));

const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');

const setPlatform = (platform: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', { value: platform });
};

afterEach(() => {
  if (platformDescriptor !== undefined) {
    Object.defineProperty(process, 'platform', platformDescriptor);
  }
  vi.clearAllMocks();
});

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

const makeFakeChild = () => {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; pid: number };
  child.stdout = stdout;
  child.stderr = stderr;
  child.pid = 4242;
  void Promise.resolve().then(() => {
    stdout.emit('data', Buffer.from(JSON.stringify({ type: 'result', exitCode: 0, usage: { inputTokens: 10 } }) + '\n'));
    child.emit('close', 0);
  });
  return child;
};

describe('registerCopilotSpecifyIpc Windows binary resolution', () => {
  it('resolves the Copilot manifest binary before the Specify print-mode spawn on win32', async () => {
    setPlatform('win32');
    const harness = createHarness();
    const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-winauth-specify-'));
    const featureRel = 'specs/0016-windows-copilot-auth';
    await mkdir(path.join(repositoryPath, '.specify'), { recursive: true });
    await mkdir(path.join(repositoryPath, featureRel), { recursive: true });
    await writeFile(path.join(repositoryPath, '.specify', 'feature.json'), JSON.stringify({ feature_directory: featureRel }), 'utf8');
    await writeFile(path.join(repositoryPath, featureRel, 'spec.md'), '# spec', 'utf8');
    const spawnFn = vi.fn(() => makeFakeChild()) as unknown as SpawnAdapter;

    registerCopilotSpecifyIpc({
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      evaluateReadiness: vi.fn().mockResolvedValue({ ready: true, checks: [{ name: 'copilot-authed', ok: true, detail: 'ok' }] }),
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'sha-123' } }),
      reconcileFeatureJson: vi.fn().mockResolvedValue({ featureDirectory: featureRel, changed: false }),
      branchReader: vi.fn().mockResolvedValue('0016-windows-copilot-auth'),
      spawnFn
    });

    await harness.handlers.get(COPILOT_SPECIFY_CHANNEL)?.({ sender: harness.sender }, {
      subscriptionId: 'sub-1',
      branch: '0016-windows-copilot-auth',
      prompt: 'Fix Windows Copilot auth',
      modelId: 'gpt-5.5',
      repositoryPath
    });

    await vi.waitFor(() => expect(spawnFn).toHaveBeenCalled());
    expect(resolveWindowsBinary).toHaveBeenCalledWith('copilot');
    expect(spawnFn).toHaveBeenCalledWith(
      'C:\\Users\\monalisa\\AppData\\Local\\GitHubCopilot\\copilot.exe',
      expect.any(Array),
      expect.objectContaining({ cwd: repositoryPath, shell: false, detached: true })
    );
    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith(
      COPILOT_SPECIFY_EVENT_CHANNEL,
      expect.objectContaining({
        event: expect.objectContaining({ type: 'done', step: 'specify', status: 'pass' })
      })
    ));
  });
});
