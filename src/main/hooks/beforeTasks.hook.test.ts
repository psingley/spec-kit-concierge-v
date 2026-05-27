import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beforeTasksHook } from './beforeTasks.hook';
import { runBeforeHook } from './hookHelpers';

vi.mock('./hookHelpers', () => ({ runBeforeHook: vi.fn() }));

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('beforeTasksHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to runBeforeHook with tasks', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: true, phase: 'before', step: 'tasks' });
    const result = await beforeTasksHook(context);
    expect(runBeforeHook).toHaveBeenCalledWith('tasks', context);
    expect(runBeforeHook).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, step: 'tasks' });
  });

  it('returns delegated failures unchanged', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: false, phase: 'before', step: 'tasks', escapeHatchReason: 'auth-unavailable' });
    const result = await beforeTasksHook(context);
    expect(result).toMatchObject({ ok: false, escapeHatchReason: 'auth-unavailable' });
    expect(runBeforeHook).toHaveBeenCalledWith('tasks', context);
    expect(runBeforeHook).toHaveReturnedTimes(1);
  });

  it('passes the original context reference', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: true, phase: 'before', step: 'tasks' });
    await beforeTasksHook(context);
    expect(vi.mocked(runBeforeHook).mock.calls[0]?.[1]).toBe(context);
    expect(vi.mocked(runBeforeHook).mock.calls[0]?.[0]).toBe('tasks');
    expect(context.repositoryPath).toBe('/repo');
  });
});
