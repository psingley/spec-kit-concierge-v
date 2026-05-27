import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beforeAnalyzeHook } from './beforeAnalyze.hook';
import { runBeforeHook } from './hookHelpers';

vi.mock('./hookHelpers', () => ({ runBeforeHook: vi.fn() }));

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('beforeAnalyzeHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to runBeforeHook with analyze', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: true, phase: 'before', step: 'analyze' });
    const result = await beforeAnalyzeHook(context);
    expect(runBeforeHook).toHaveBeenCalledWith('analyze', context);
    expect(runBeforeHook).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, step: 'analyze' });
  });

  it('returns delegated failures unchanged', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: false, phase: 'before', step: 'analyze', escapeHatchReason: 'prerequisite-missing' });
    const result = await beforeAnalyzeHook(context);
    expect(result).toMatchObject({ ok: false, escapeHatchReason: 'prerequisite-missing' });
    expect(runBeforeHook).toHaveBeenCalledWith('analyze', context);
    expect(runBeforeHook).toHaveReturnedTimes(1);
  });

  it('passes the original context reference', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: true, phase: 'before', step: 'analyze' });
    await beforeAnalyzeHook(context);
    expect(vi.mocked(runBeforeHook).mock.calls[0]?.[1]).toBe(context);
    expect(vi.mocked(runBeforeHook).mock.calls[0]?.[0]).toBe('analyze');
    expect(context.sessionId).toBe('s1');
  });
});
