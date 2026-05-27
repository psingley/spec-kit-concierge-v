import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beforePlanHook } from './beforePlan.hook';
import { runBeforeHook } from './hookHelpers';

vi.mock('./hookHelpers', () => ({ runBeforeHook: vi.fn() }));

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('beforePlanHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to runBeforeHook with plan', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: true, phase: 'before', step: 'plan' });
    const result = await beforePlanHook(context);
    expect(runBeforeHook).toHaveBeenCalledWith('plan', context);
    expect(runBeforeHook).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, step: 'plan' });
  });

  it('returns delegated failures unchanged', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: false, phase: 'before', step: 'plan', escapeHatchReason: 'mcp-unavailable' });
    const result = await beforePlanHook(context);
    expect(result).toMatchObject({ ok: false, escapeHatchReason: 'mcp-unavailable' });
    expect(runBeforeHook).toHaveBeenCalledWith('plan', context);
    expect(runBeforeHook).toHaveReturnedTimes(1);
  });

  it('passes the original context reference', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: true, phase: 'before', step: 'plan' });
    await beforePlanHook(context);
    expect(vi.mocked(runBeforeHook).mock.calls[0]?.[1]).toBe(context);
    expect(vi.mocked(runBeforeHook).mock.calls[0]?.[0]).toBe('plan');
    expect(context.sessionId).toBe('s1');
  });
});
