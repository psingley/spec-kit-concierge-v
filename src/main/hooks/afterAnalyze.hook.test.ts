import { beforeEach, describe, expect, it, vi } from 'vitest';
import { afterAnalyzeHook } from './afterAnalyze.hook';
import { runAfterHook } from './hookHelpers';

vi.mock('./hookHelpers', () => ({ runAfterHook: vi.fn() }));

const context = { repositoryPath: '/repo', featureDir: '/feature', sessionId: 's1', userDataPath: '/tmp/user' };

describe('afterAnalyzeHook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to runAfterHook with analyze', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: true, phase: 'after', step: 'analyze' });
    const result = await afterAnalyzeHook(context);
    expect(runAfterHook).toHaveBeenCalledWith('analyze', context);
    expect(runAfterHook).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, step: 'analyze' });
  });

  it('returns delegated failures unchanged', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: false, phase: 'after', step: 'analyze', escapeHatchReason: 'factory-rejected' });
    const result = await afterAnalyzeHook(context);
    expect(result).toMatchObject({ ok: false, escapeHatchReason: 'factory-rejected' });
    expect(runAfterHook).toHaveBeenCalledWith('analyze', context);
    expect(runAfterHook).toHaveReturnedTimes(1);
  });

  it('passes the original context reference', async () => {
    vi.mocked(runAfterHook).mockResolvedValue({ ok: true, phase: 'after', step: 'analyze' });
    await afterAnalyzeHook(context);
    expect(vi.mocked(runAfterHook).mock.calls[0]?.[1]).toBe(context);
    expect(vi.mocked(runAfterHook).mock.calls[0]?.[0]).toBe('analyze');
    expect(context.featureDir).toBe('/feature');
  });
});
