import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateClarifyArtifacts } from './clarify.factory';

const fsMocks = vi.hoisted(() => ({ readFile: vi.fn() }));

vi.mock('node:fs/promises', () => ({
  default: { readFile: fsMocks.readFile },
  readFile: fsMocks.readFile
}));

describe('validateClarifyArtifacts', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('happy path', () => {
    it('returns a commit candidate for well-formed questions in spec.md', async () => {
      vi.mocked(readFile).mockResolvedValue(`# Feature Spec

## Clarifications

Q: Which API should the workflow call first?
- A: GitHub
- B: Jira

Q: Where should answers be written?
- A: spec.md
- B: clarifications.md

## Requirements

Q: This requirement example is outside the Clarifications section
- A: Ignore
- B: Ignore` as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result.ok).toBe(true);
      expect(result).toMatchObject({ commit: { step: 'clarify', files: ['spec.md'] } });
      expect(result).toMatchObject({ questions: [expect.objectContaining({ id: 'q1', position: 1 }), expect.objectContaining({ id: 'q2', position: 2 })] });
      expect(vi.mocked(readFile)).toHaveBeenCalledWith(path.join('/feature', 'spec.md'), 'utf8');
    });
  });

  describe('empty object equivalent', () => {
    it('returns a named error when no questions are found', async () => {
      vi.mocked(readFile).mockResolvedValue('## Clarifications\n\n{}' as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result).toMatchObject({ ok: false, kind: 'escape-hatch', escapeHatchReason: 'factory-rejected' });
    });
  });

  describe('null artifact read', () => {
    it('returns a named error', async () => {
      vi.mocked(readFile).mockResolvedValue(null as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result).toMatchObject({ ok: false, kind: 'escape-hatch', escapeHatchReason: 'factory-rejected' });
    });
  });

  describe('undefined artifact read', () => {
    it('returns a named error', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('missing'));

      const result = await validateClarifyArtifacts('/feature');

      expect(result).toMatchObject({ ok: false, kind: 'escape-hatch', escapeHatchReason: 'factory-rejected' });
    });
  });

  describe('hostile malformed input', () => {
    it('rejects frontmatter-like blocks', async () => {
      vi.mocked(readFile).mockResolvedValue(`---
token: secret
---

Q: Pick one
- A: Alpha
- B: Beta` as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result).toMatchObject({ ok: false, kind: 'escape-hatch', escapeHatchReason: 'factory-rejected' });
    });
  });

  describe('partial structurally plausible input', () => {
    it('reports malformed questions with one-based position', async () => {
      const logger = { warn: vi.fn() };
      vi.mocked(readFile).mockResolvedValue('Q: Pick one\n- A: Alpha' as never);

      const result = await validateClarifyArtifacts('/feature', { logger, modelId: 'model-1', now: () => new Date('2026-05-27T00:00:00.000Z') });

      expect(result).toMatchObject({ kind: 'malformed-questions', malformedQuestions: [expect.objectContaining({ malformationCategory: 'choices-missing', position: 1 })] });
      expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ modelId: 'model-1', malformationCategory: 'choices-missing' }), 'clarify question malformed');
    });
  });

  describe('extra-key rejection', () => {
    it('rejects blocks with unexpected keys', async () => {
      vi.mocked(readFile).mockResolvedValue('Q: Pick one\n- A: Alpha\n- B: Beta\nmodel: hostile' as never);

      await expect(validateClarifyArtifacts('/feature')).resolves.toMatchObject({ ok: false, kind: 'malformed-questions', malformedQuestions: [expect.objectContaining({ malformationCategory: 'unexpected-key', position: 1 })] });
    });
  });

  describe('zero-question sentinel', () => {
    it('honors the exact no-question sentinel only', async () => {
      vi.mocked(readFile).mockResolvedValue('no questions needed' as never);
      await expect(validateClarifyArtifacts('/feature')).resolves.toMatchObject({ ok: true, commit: { files: ['spec.md'] } });

      vi.mocked(readFile).mockResolvedValue('No questions needed' as never);
      await expect(validateClarifyArtifacts('/feature')).resolves.toMatchObject({ ok: false, kind: 'escape-hatch' });
    });
  });
});
