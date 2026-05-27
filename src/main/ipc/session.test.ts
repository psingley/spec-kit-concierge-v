import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createMainLogger } from '../logging';
import { registerSessionIpc, SESSION_CREATE_ACP_CHANNEL, SESSION_LIST_ACP_CHANNEL } from './session';

const createTestLogger = () =>
  createMainLogger({
    userDataPath: mkdtempSync(path.join(tmpdir(), 'concierge-ipc-session-')),
    enablePrettyStream: false
  });

describe('registerSessionIpc', () => {
  it('lists and creates ACP sessions through the Run 3 session contract', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const info = vi.spyOn(logger, 'info');
    const session = {
      listSessions: vi.fn(async () => [{ sessionId: 's1', title: 'Work', cwd: '/repo', updatedAt: 'now' }]),
      newSession: vi.fn(async () => ({ sessionId: 's2', currentModeId: 'mode', currentModelId: 'model', configOptions: [] })),
      setModel: vi.fn(async () => {}),
      dispose: vi.fn(async () => ({ outcome: 'closed' }))
    };

    registerSessionIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      userDataPath: '/tmp/user-data',
      sessionFactory: vi.fn(async () => session)
    });

    await expect(handlers.get(SESSION_LIST_ACP_CHANNEL)?.({ sender: { id: 7 } }, { cwd: '/repo' })).resolves.toEqual({
      sessions: [{ sessionId: 's1', title: 'Work', cwd: '/repo', updatedAt: 'now' }]
    });
    await expect(
      handlers.get(SESSION_CREATE_ACP_CHANNEL)?.({ sender: { id: 7 } }, { cwd: '/repo', mcpServers: [], modelId: 'gpt-5.5' })
    ).resolves.toEqual({
      sessionId: 's2',
      currentModeId: 'mode',
      currentModelId: 'gpt-5.5'
    });
    expect(session.dispose).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenCalledWith(expect.objectContaining({ channel: SESSION_LIST_ACP_CHANNEL, context: { senderId: 7 }, success: true }), 'ipc handler invocation');
    expect(info).toHaveBeenCalledWith(expect.objectContaining({ channel: SESSION_CREATE_ACP_CHANNEL, context: { senderId: 7 }, success: true }), 'ipc handler invocation');
  });

  it.each([
    [SESSION_LIST_ACP_CHANNEL, { cwd: '/repo' }],
    [SESSION_CREATE_ACP_CHANNEL, { cwd: '/repo', mcpServers: [] }]
  ])('logs and propagates %s failures', async (channel, payload) => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const errorLog = vi.spyOn(logger, 'error');
    const error = new Error(`${channel} failed`);

    registerSessionIpc({
      ipcMain: { handle: vi.fn((registeredChannel, handler) => handlers.set(registeredChannel, handler)) },
      logger,
      userDataPath: '/tmp/user-data',
      sessionFactory: vi.fn(async () => {
        throw error;
      })
    });

    await expect(handlers.get(channel)?.({ sender: { id: 8 } }, payload)).rejects.toThrow(error);
    expect(errorLog).toHaveBeenCalledWith(expect.objectContaining({ channel, context: { senderId: 8 }, success: false, error }), 'ipc handler invocation');
  });
});
