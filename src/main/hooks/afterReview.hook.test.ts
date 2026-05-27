import { beforeEach, describe, expect, it, vi } from 'vitest';
import { afterReviewHook } from './afterReview.hook';
import { runAfterHook } from './hookHelpers';

vi.mock('./hookHelpers', () => ({ runAfterHook: vi.fn() }));

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('afterReviewHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to runAfterHook with review', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: true, phase: 'after', step: 'review' });
    const result = await afterReviewHook(context);
    expect(runAfterHook).toHaveBeenCalledWith('review', context);
    expect(runAfterHook).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, step: 'review' });
  });

  it('returns delegated failures unchanged', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: false, phase: 'after', step: 'review', escapeHatchReason: 'git-commit-failed' });
    const result = await afterReviewHook(context);
    expect(result).toMatchObject({ ok: false, escapeHatchReason: 'git-commit-failed' });
    expect(runAfterHook).toHaveBeenCalledWith('review', context);
    expect(runAfterHook).toHaveReturnedTimes(1);
  });

  it('passes the original context reference', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: true, phase: 'after', step: 'review' });
    await afterReviewHook(context);
    expect(vi.mocked(runAfterHook).mock.calls[0]?.[1]).toBe(context);
    expect(vi.mocked(runAfterHook).mock.calls[0]?.[0]).toBe('review');
    expect(context.userDataPath).toBe('/tmp/user');
  });
});
