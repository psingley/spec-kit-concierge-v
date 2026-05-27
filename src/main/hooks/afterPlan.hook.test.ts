import { beforeEach, describe, expect, it, vi } from 'vitest';
import { afterPlanHook } from './afterPlan.hook';
import { runAfterHook } from './hookHelpers';

vi.mock('./hookHelpers', () => ({ runAfterHook: vi.fn() }));

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('afterPlanHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to runAfterHook with plan', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: true, phase: 'after', step: 'plan' });
    const result = await afterPlanHook(context);
    expect(runAfterHook).toHaveBeenCalledWith('plan', context);
    expect(runAfterHook).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, step: 'plan' });
  });

  it('returns delegated failures unchanged', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: false, phase: 'after', step: 'plan', escapeHatchReason: 'factory-rejected' });
    const result = await afterPlanHook(context);
    expect(result).toMatchObject({ ok: false, escapeHatchReason: 'factory-rejected' });
    expect(runAfterHook).toHaveBeenCalledWith('plan', context);
    expect(runAfterHook).toHaveReturnedTimes(1);
  });

  it('passes the original context reference', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: true, phase: 'after', step: 'plan' });
    await afterPlanHook(context);
    expect(vi.mocked(runAfterHook).mock.calls[0]?.[1]).toBe(context);
    expect(vi.mocked(runAfterHook).mock.calls[0]?.[0]).toBe('plan');
    expect(context.featureDir).toBe('/feature');
  });
});
