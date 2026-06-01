import { describe, expect, it, vi } from 'vitest';
import { registerReposIpc, REPOS_LIST_CHANNEL } from './repos';

describe('registerReposIpc', () => {
  it('passes the validated owner to the repository data-layer', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = { info: vi.fn(), error: vi.fn() };
    const listRepos = vi.fn(async () => [
      {
        id: '1',
        name: 'collette-web',
        owner: 'collette-travel',
        path: 'collette-travel/collette-web',
        defaultBranch: 'main'
      }
    ]);

    registerReposIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      listRepos,
      now: () => 1
    });

    await expect(handlers.get(REPOS_LIST_CHANNEL)?.({ sender: { id: 3 } }, { owner: 'collette-travel' })).resolves.toEqual({
      repositories: [
        {
          id: '1',
          name: 'collette-web',
          owner: 'collette-travel',
          path: 'collette-travel/collette-web',
          defaultBranch: 'main'
        }
      ]
    });
    expect(listRepos).toHaveBeenCalledWith('collette-travel');
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ channel: REPOS_LIST_CHANNEL, context: { senderId: 3 }, success: true }),
      'ipc handler invocation'
    );
  });

  it('treats an empty payload as a request for the signed-in account and passes no owner', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = { info: vi.fn(), error: vi.fn() };
    const listRepos = vi.fn(async () => []);

    registerReposIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      listRepos,
      now: () => 1
    });

    await expect(handlers.get(REPOS_LIST_CHANNEL)?.({ sender: { id: 7 } }, {})).resolves.toEqual({ repositories: [] });
    expect(listRepos).toHaveBeenCalledWith(undefined);
  });
});
