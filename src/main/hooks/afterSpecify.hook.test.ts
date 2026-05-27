import { beforeEach, describe, expect, it, vi } from 'vitest';
import { afterSpecifyHook } from './afterSpecify.hook';
import { runAfterHook } from './hookHelpers';

vi.mock('./hookHelpers', () => ({ runAfterHook: vi.fn() }));

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('afterSpecifyHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to runAfterHook with specify', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: true, phase: 'after', step: 'specify' });
    const result = await afterSpecifyHook(context);
    expect(runAfterHook).toHaveBeenCalledWith('specify', context);
    expect(runAfterHook).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, step: 'specify' });
  });

  it('returns delegated failures unchanged', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: false, phase: 'after', step: 'specify', escapeHatchReason: 'factory-rejected' });
    const result = await afterSpecifyHook(context);
    expect(result).toMatchObject({ ok: false, escapeHatchReason: 'factory-rejected' });
    expect(runAfterHook).toHaveBeenCalledWith('specify', context);
    expect(runAfterHook).toHaveReturnedTimes(1);
  });

  it('passes the original context reference', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: true, phase: 'after', step: 'specify' });
    await afterSpecifyHook(context);
    expect(vi.mocked(runAfterHook).mock.calls[0]?.[1]).toBe(context);
    expect(vi.mocked(runAfterHook).mock.calls[0]?.[0]).toBe('specify');
    expect(context.featureDir).toBe('/feature');
  });
});
