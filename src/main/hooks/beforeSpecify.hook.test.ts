import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beforeSpecifyHook } from './beforeSpecify.hook';
import { runBeforeHook } from './hookHelpers';

vi.mock('./hookHelpers', () => ({ runBeforeHook: vi.fn() }));

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('beforeSpecifyHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to runBeforeHook with specify', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: true, phase: 'before', step: 'specify' });
    const result = await beforeSpecifyHook(context);
    expect(runBeforeHook).toHaveBeenCalledWith('specify', context);
    expect(runBeforeHook).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, step: 'specify' });
  });

  it('returns delegated failures unchanged', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: false, phase: 'before', step: 'specify', escapeHatchReason: 'hook-failed' });
    const result = await beforeSpecifyHook(context);
    expect(result).toMatchObject({ ok: false, escapeHatchReason: 'hook-failed' });
    expect(runBeforeHook).toHaveBeenCalledWith('specify', context);
    expect(runBeforeHook).toHaveReturnedTimes(1);
  });

  it('passes the original context reference', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: true, phase: 'before', step: 'specify' });
    await beforeSpecifyHook(context);
    expect(vi.mocked(runBeforeHook).mock.calls[0]?.[1]).toBe(context);
    expect(vi.mocked(runBeforeHook).mock.calls[0]?.[0]).toBe('specify');
    expect(context.sessionId).toBe('s1');
  });
});
