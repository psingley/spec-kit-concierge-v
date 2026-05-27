import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { validateClarifyArtifacts } from './clarify.factory';

const fsMocks = vi.hoisted(() => ({ readFile: vi.fn() }));

vi.mock('node:fs/promises', () => ({
  default: { readFile: fsMocks.readFile },
  readFile: fsMocks.readFile
}));

describe('validateClarifyArtifacts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns commit candidate for no-questions-needed clarification', async () => {
    vi.mocked(readFile).mockResolvedValue('No questions needed.' as never);

    const result = await validateClarifyArtifacts('/feature');

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ commit: { step: 'clarify', files: ['clarifications.md'] } });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(1);
  });

  it('rejects missing required clarification artifact', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('missing'));

    const result = await validateClarifyArtifacts('/feature');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ escapeHatchReason: 'factory-rejected' });
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(1);
  });

  it('reports malformed questions and logs the malformed category', async () => {
    const logger = { warn: vi.fn() };
    vi.mocked(readFile).mockResolvedValue('Q: Pick one\n- A: Alpha\n- B: Beta' as never);

    const result = await validateClarifyArtifacts('/feature', { logger, modelId: 'model-1', now: () => new Date('2026-05-27T00:00:00.000Z') });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: 'malformed-questions', malformedQuestions: [expect.objectContaining({ malformationCategory: 'short-answer-missing' })] });
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ modelId: 'model-1', malformationCategory: 'short-answer-missing' }), 'clarify question malformed');
  });
});
