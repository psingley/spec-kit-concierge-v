import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beforeClarifyHook } from './beforeClarify.hook';
import { runBeforeHook } from './hookHelpers';

vi.mock('./hookHelpers', () => ({ runBeforeHook: vi.fn() }));

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('beforeClarifyHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to runBeforeHook with clarify', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: true, phase: 'before', step: 'clarify' });
    const result = await beforeClarifyHook(context);
    expect(runBeforeHook).toHaveBeenCalledWith('clarify', context);
    expect(runBeforeHook).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, step: 'clarify' });
  });

  it('returns delegated failures unchanged', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: false, phase: 'before', step: 'clarify', escapeHatchReason: 'prerequisite-missing' });
    const result = await beforeClarifyHook(context);
    expect(result).toMatchObject({ ok: false, escapeHatchReason: 'prerequisite-missing' });
    expect(runBeforeHook).toHaveBeenCalledWith('clarify', context);
    expect(runBeforeHook).toHaveReturnedTimes(1);
  });

  it('passes the original context reference', async () => {
    vi.mocked(runBeforeHook).mockResolvedValue({ ok: true, phase: 'before', step: 'clarify' });
    await beforeClarifyHook(context);
    expect(vi.mocked(runBeforeHook).mock.calls[0]?.[1]).toBe(context);
    expect(vi.mocked(runBeforeHook).mock.calls[0]?.[0]).toBe('clarify');
    expect(context.repositoryPath).toBe('/repo');
  });
});
