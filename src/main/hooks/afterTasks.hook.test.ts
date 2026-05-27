import { beforeEach, describe, expect, it, vi } from 'vitest';
import { afterTasksHook } from './afterTasks.hook';
import { runAfterHook } from './hookHelpers';

vi.mock('./hookHelpers', () => ({ runAfterHook: vi.fn() }));

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('afterTasksHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to runAfterHook with tasks', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: true, phase: 'after', step: 'tasks' });
    const result = await afterTasksHook(context);
    expect(runAfterHook).toHaveBeenCalledWith('tasks', context);
    expect(runAfterHook).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, step: 'tasks' });
  });

  it('returns delegated failures unchanged', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: false, phase: 'after', step: 'tasks', escapeHatchReason: 'factory-rejected' });
    const result = await afterTasksHook(context);
    expect(result).toMatchObject({ ok: false, escapeHatchReason: 'factory-rejected' });
    expect(runAfterHook).toHaveBeenCalledWith('tasks', context);
    expect(runAfterHook).toHaveReturnedTimes(1);
  });

  it('passes the original context reference', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: true, phase: 'after', step: 'tasks' });
    await afterTasksHook(context);
    expect(vi.mocked(runAfterHook).mock.calls[0]?.[1]).toBe(context);
    expect(vi.mocked(runAfterHook).mock.calls[0]?.[0]).toBe('tasks');
    expect(context.userDataPath).toBe('/tmp/user');
  });
});
