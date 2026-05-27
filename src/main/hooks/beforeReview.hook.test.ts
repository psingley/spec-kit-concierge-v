import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beforeReviewHook } from './beforeReview.hook';
import { runBeforeHook } from './hookHelpers';

vi.mock('./hookHelpers', () => ({ runBeforeHook: vi.fn() }));

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('beforeReviewHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to runBeforeHook with review', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: true, phase: 'before', step: 'review' });
    const result = await beforeReviewHook(context);
    expect(runBeforeHook).toHaveBeenCalledWith('review', context);
    expect(runBeforeHook).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, step: 'review' });
  });

  it('returns delegated failures unchanged', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: false, phase: 'before', step: 'review', escapeHatchReason: 'auth-unavailable' });
    const result = await beforeReviewHook(context);
    expect(result).toMatchObject({ ok: false, escapeHatchReason: 'auth-unavailable' });
    expect(runBeforeHook).toHaveBeenCalledWith('review', context);
    expect(runBeforeHook).toHaveReturnedTimes(1);
  });

  it('passes the original context reference', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: true, phase: 'before', step: 'review' });
    await beforeReviewHook(context);
    expect(vi.mocked(runBeforeHook).mock.calls[0]?.[1]).toBe(context);
    expect(vi.mocked(runBeforeHook).mock.calls[0]?.[0]).toBe('review');
    expect(context.repositoryPath).toBe('/repo');
  });
});
