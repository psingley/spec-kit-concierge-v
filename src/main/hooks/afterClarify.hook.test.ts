import { beforeEach, describe, expect, it, vi } from 'vitest';
import { afterClarifyHook } from './afterClarify.hook';
import { runAfterHook } from './hookHelpers';

vi.mock('./hookHelpers', () => ({ runAfterHook: vi.fn() }));

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('afterClarifyHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to runAfterHook with clarify', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: true, phase: 'after', step: 'clarify' });
    const result = await afterClarifyHook(context);
    expect(runAfterHook).toHaveBeenCalledWith('clarify', context);
    expect(runAfterHook).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, step: 'clarify' });
  });

  it('returns delegated failures unchanged', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: false, phase: 'after', step: 'clarify', escapeHatchReason: 'clarify-malformed' });
    const result = await afterClarifyHook(context);
    expect(result).toMatchObject({ ok: false, escapeHatchReason: 'clarify-malformed' });
    expect(runAfterHook).toHaveBeenCalledWith('clarify', context);
    expect(runAfterHook).toHaveReturnedTimes(1);
  });

  it('passes the original context reference', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: true, phase: 'after', step: 'clarify' });
    await afterClarifyHook(context);
    expect(vi.mocked(runAfterHook).mock.calls[0]?.[1]).toBe(context);
    expect(vi.mocked(runAfterHook).mock.calls[0]?.[0]).toBe('clarify');
    expect(context.userDataPath).toBe('/tmp/user');
  });
});
