import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchStepHook } from './dispatcher';
import type { StepHookContext } from './types';

vi.mock('../logging', () => ({
  createMainLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }))
}));

vi.mock('./beforeSpecify.hook', () => ({ beforeSpecifyHook: vi.fn() }));
vi.mock('./afterSpecify.hook', () => ({ afterSpecifyHook: vi.fn() }));
vi.mock('./beforeClarify.hook', () => ({ beforeClarifyHook: vi.fn() }));
vi.mock('./afterClarify.hook', () => ({ afterClarifyHook: vi.fn() }));
vi.mock('./beforePlan.hook', () => ({ beforePlanHook: vi.fn() }));
vi.mock('./afterPlan.hook', () => ({ afterPlanHook: vi.fn() }));
vi.mock('./beforeTasks.hook', () => ({ beforeTasksHook: vi.fn() }));
vi.mock('./afterTasks.hook', () => ({ afterTasksHook: vi.fn() }));
vi.mock('./beforeAnalyze.hook', () => ({ beforeAnalyzeHook: vi.fn() }));
vi.mock('./afterAnalyze.hook', () => ({ afterAnalyzeHook: vi.fn() }));
vi.mock('./beforeReview.hook', () => ({ beforeReviewHook: vi.fn() }));
vi.mock('./afterReview.hook', () => ({ afterReviewHook: vi.fn() }));

const { beforeSpecifyHook } = await import('./beforeSpecify.hook');
const { afterReviewHook } = await import('./afterReview.hook');

const base = (): StepHookContext => ({
  repositoryPath: '/repo',
  featureDir: '/repo/specs/0001',
  sessionId: 's1',
  userDataPath: '/tmp/user'
});

describe('dispatchStepHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes before hook names to the matching hook', async () => {
    vi.mocked(beforeSpecifyHook).mockResolvedValue({ ok: true, phase: 'before', step: 'specify' });

    const result = await dispatchStepHook({ ...base(), hookName: 'before_specify' });

    expect(beforeSpecifyHook).toHaveBeenCalledTimes(1);
    expect(beforeSpecifyHook).toHaveBeenCalledWith(expect.objectContaining({ hookName: 'before_specify', sessionId: 's1' }));
    expect(result).toMatchObject({ ok: true, phase: 'before', step: 'specify' });
  });

  it('routes after hook names to the matching hook', async () => {
    vi.mocked(afterReviewHook).mockResolvedValue({ ok: true, phase: 'after', step: 'review' });

    const result = await dispatchStepHook({ ...base(), hookName: 'after_review' });

    expect(afterReviewHook).toHaveBeenCalledTimes(1);
    expect(afterReviewHook).toHaveBeenCalledWith(expect.objectContaining({ hookName: 'after_review', sessionId: 's1' }));
    expect(result).toMatchObject({ ok: true, phase: 'after', step: 'review' });
  });

  it('returns hook-failed for unknown hook names', async () => {
    const result = await dispatchStepHook({ ...base(), hookName: 'before_deploy' });

    expect(result).toMatchObject({ ok: false, phase: 'before', step: 'specify', escapeHatchReason: 'hook-failed' });
    expect(beforeSpecifyHook).not.toHaveBeenCalled();
    expect(afterReviewHook).not.toHaveBeenCalled();
  });
});
