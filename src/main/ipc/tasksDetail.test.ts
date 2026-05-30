import { readFile, stat } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTasksDetailIpc, TASKS_DETAIL_CHANNEL } from './tasksDetail';

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  stat: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: fsMocks.readFile,
    stat: fsMocks.stat
  },
  readFile: fsMocks.readFile,
  stat: fsMocks.stat
}));

const mockedReadFile = vi.mocked(readFile);
const mockedStat = vi.mocked(stat);

describe('registerTasksDetailIpc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStat.mockResolvedValue({ size: 128, mtimeMs: 1 } as never);
    mockedReadFile.mockResolvedValue('- [ ] T1 Move parser to `src/main/domain/tasksDetail.ts` Acceptance: done' as never);
  });

  it('registers tasks:detail and returns parsed tasks from tasks.md', async () => {
    const handle = vi.fn();
    const logger = { info: vi.fn(), error: vi.fn() };

    registerTasksDetailIpc({ ipcMain: { handle }, logger, now: () => 10 });
    const handler = handle.mock.calls[0]?.[1] as (event: unknown, payload: unknown) => Promise<unknown>;

    await expect(handler({ sender: { id: 7 } }, {
      repositoryPath: '/repo',
      artifactPath: 'specs/0001/tasks.md'
    })).resolves.toEqual({
      tasks: [{
        id: 'T1',
        title: 'Move parser to `src/main/domain/tasksDetail.ts`',
        phase: undefined,
        dependencies: [],
        files: ['src/main/domain/tasksDetail.ts'],
        acceptance: 'done'
      }]
    });

    expect(handle).toHaveBeenCalledWith(TASKS_DETAIL_CHANNEL, expect.any(Function));
    expect(mockedStat).toHaveBeenCalledWith('/repo/specs/0001/tasks.md');
    expect(mockedReadFile).toHaveBeenCalledWith('/repo/specs/0001/tasks.md', 'utf8');
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ channel: TASKS_DETAIL_CHANNEL, success: true }), 'ipc handler invocation');
  });

  it('rejects files larger than the artifact guard', async () => {
    mockedStat.mockResolvedValue({ size: 512 * 1024 + 1, mtimeMs: 1 } as never);
    const handle = vi.fn();
    const logger = { info: vi.fn(), error: vi.fn() };

    registerTasksDetailIpc({ ipcMain: { handle }, logger, now: () => 10 });
    const handler = handle.mock.calls[0]?.[1] as (event: unknown, payload: unknown) => Promise<unknown>;

    await expect(handler({ sender: { id: 7 } }, {
      repositoryPath: '/repo',
      artifactPath: 'specs/0001/tasks.md'
    })).rejects.toThrow('Artifact is too large to read.');
    expect(mockedReadFile).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ channel: TASKS_DETAIL_CHANNEL, success: false }), 'ipc handler invocation');
  });
});
