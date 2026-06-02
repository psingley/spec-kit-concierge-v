import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { validateClarifyArtifacts } from './clarify.factory';
import type { StepContractContext } from './types';

const fsMocks = vi.hoisted(() => ({ readFile: vi.fn() }));

vi.mock('node:fs/promises', () => ({
  default: { readFile: fsMocks.readFile },
  readFile: fsMocks.readFile
}));

describe('validateClarifyArtifacts', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('spec-kit real "- Q: → A:" format', () => {
    it('commits when resolved - Q: → A: bullets are present', async () => {
      vi.mocked(readFile).mockResolvedValue(`# Feature Spec

## Clarifications

### Session 2026-06-01

- Q: Which API should the workflow call first? → A: GitHub
- Q: Where should answers be written? → A: spec.md

## Requirements

Body unrelated to clarifications.` as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result.ok).toBe(true);
      expect(result).toMatchObject({ commit: { step: 'clarify', files: ['spec.md'] } });
      expect(vi.mocked(readFile)).toHaveBeenCalledWith('/feature/spec.md', 'utf8');
    });

    it('tolerates the ASCII -> arrow variant', async () => {
      vi.mocked(readFile).mockResolvedValue(`## Clarifications

### Session 2026-06-01

- Q: Pick a target? -> A: Production` as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result.ok).toBe(true);
      expect(result).toMatchObject({ commit: { step: 'clarify', files: ['spec.md'] } });
    });

    // Live-repro regression: spec-kit's no-questions-needed flow leaves Pending
    // answers. These are advisory, not blocking, and MUST still commit.
    it('regression: commits with Pending answers (live-repro)', async () => {
      vi.mocked(readFile).mockResolvedValue(`# Feature Spec

## Clarifications

### Session 2026-06-01

- Q: First open question? → A: Pending
- Q: Second open question? → A: Pending
- Q: Third open question? → A: Pending
- Q: Fourth open question? → A: Pending
- Q: Fifth open question? → A: Pending` as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result.ok).toBe(true);
      expect(result).toMatchObject({ commit: { step: 'clarify', files: ['spec.md'] } });
    });
  });

  describe('no clarifications to record', () => {
    it('requests an empty marker commit when a valid no-clarifications pass has no spec delta', async () => {
      const hasArtifactDelta = vi.fn().mockResolvedValue(false);
      const context = {
        repositoryPath: '/repo',
        featureDir: '/repo/specs/0001',
        hasArtifactDelta
      } as unknown as StepContractContext;
      vi.mocked(readFile).mockResolvedValue('# Feature Spec\n\n## Requirements\n\nSome content.' as never);

      const result = await validateClarifyArtifacts('/repo/specs/0001', context);

      expect(result.ok).toBe(true);
      expect(hasArtifactDelta).toHaveBeenCalledWith(['spec.md']);
      expect(result).toMatchObject({
        commit: {
          step: 'clarify',
          files: ['specs/0001/spec.md'],
          allowEmptyCommit: true
        }
      });
    });

    it('keeps a normal commit candidate when clarify changed spec.md', async () => {
      const hasArtifactDelta = vi.fn().mockResolvedValue(true);
      const context = {
        repositoryPath: '/repo',
        featureDir: '/repo/specs/0001',
        hasArtifactDelta
      } as unknown as StepContractContext;
      vi.mocked(readFile).mockResolvedValue(`# Feature Spec

## Clarifications

### Session 2026-06-01

- Q: Which API should the workflow call first? → A: GitHub` as never);

      const result = await validateClarifyArtifacts('/repo/specs/0001', context);

      expect(result.ok).toBe(true);
      expect(hasArtifactDelta).toHaveBeenCalledWith(['spec.md']);
      expect(result).toMatchObject({
        commit: {
          step: 'clarify',
          files: ['specs/0001/spec.md']
        }
      });
      expect(result.ok && result.commit.allowEmptyCommit).toBeUndefined();
    });

    it('commits when there is no ## Clarifications section', async () => {
      vi.mocked(readFile).mockResolvedValue('# Feature Spec\n\n## Requirements\n\nSome content.' as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result.ok).toBe(true);
      expect(result).toMatchObject({ commit: { step: 'clarify', files: ['spec.md'] } });
    });

    it('commits when the ## Clarifications section is present but empty', async () => {
      vi.mocked(readFile).mockResolvedValue('# Feature Spec\n\n## Clarifications\n\n## Requirements\n\nContent.' as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result.ok).toBe(true);
      expect(result).toMatchObject({ commit: { step: 'clarify', files: ['spec.md'] } });
    });

    it('honors the no-questions-needed sentinel', async () => {
      vi.mocked(readFile).mockResolvedValue('no questions needed' as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result.ok).toBe(true);
      expect(result).toMatchObject({ commit: { files: ['spec.md'] } });
    });
  });

  describe('missing / empty artifact', () => {
    it('escapes when read returns null', async () => {
      vi.mocked(readFile).mockResolvedValue(null as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result).toMatchObject({ ok: false, kind: 'escape-hatch', escapeHatchReason: 'factory-rejected' });
    });

    it('escapes when read rejects', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('missing'));

      const result = await validateClarifyArtifacts('/feature');

      expect(result).toMatchObject({ ok: false, kind: 'escape-hatch', escapeHatchReason: 'factory-rejected' });
    });
  });

  describe('hostile / malformed content', () => {
    it('rejects hostile frontmatter', async () => {
      vi.mocked(readFile).mockResolvedValue(`---
token: secret
---

## Clarifications

- Q: Pick one? → A: Alpha` as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result).toMatchObject({ ok: false, kind: 'escape-hatch', escapeHatchReason: 'factory-rejected' });
    });

    it('rejects content containing the literal MALFORMED marker', async () => {
      vi.mocked(readFile).mockResolvedValue('## Clarifications\n\n- Q: MALFORMED → A: x' as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result).toMatchObject({ ok: false, kind: 'escape-hatch', escapeHatchReason: 'factory-rejected' });
    });

    it('rejects a - Q: bullet with no answer segment', async () => {
      vi.mocked(readFile).mockResolvedValue(`## Clarifications

### Session 2026-06-01

- Q: This question has no answer arrow at all` as never);

      const result = await validateClarifyArtifacts('/feature');

      expect(result).toMatchObject({ ok: false, kind: 'escape-hatch', escapeHatchReason: 'factory-rejected' });
    });
  });
});
