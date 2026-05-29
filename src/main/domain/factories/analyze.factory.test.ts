import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { validateAnalyzeArtifacts } from './analyze.factory';

const fsMocks = vi.hoisted(() => ({ readFile: vi.fn() }));

vi.mock('node:fs/promises', () => ({
  default: { readFile: fsMocks.readFile },
  readFile: fsMocks.readFile
}));

describe('validateAnalyzeArtifacts', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('no-diff pass', () => {
    it('returns allow-empty commit candidate without requiring analyze.md', async () => {
      const result = await validateAnalyzeArtifacts('/feature');

      expect(result.ok).toBe(true);
      expect(result).toMatchObject({ commit: { step: 'analyze', files: [], allowEmptyCommit: true } });
      expect(vi.mocked(readFile)).not.toHaveBeenCalled();
    });
  });

  describe('allowed remediation targets', () => {
    it('accepts spec, plan, and tasks remediation targets', async () => {
      const result = await validateAnalyzeArtifacts('/feature', {
        remediationFiles: ['spec.md', 'plan.md', 'tasks.md']
      });

      expect(result.ok).toBe(true);
      expect(result).toMatchObject({
        commit: { step: 'analyze', files: ['spec.md', 'plan.md', 'tasks.md'], allowEmptyCommit: true }
      });
      expect(vi.mocked(readFile)).not.toHaveBeenCalled();
    });
  });

  describe('disallowed analyze artifact', () => {
    it('rejects analyze.md as a remediation target', async () => {
      const result = await validateAnalyzeArtifacts('/feature', { remediationFiles: ['analyze.md'] });

      expect(result.ok).toBe(false);
      expect(result).toMatchObject({ escapeHatchReason: 'factory-rejected' });
      expect(vi.mocked(readFile)).not.toHaveBeenCalled();
    });
  });

  describe('outside-feature target', () => {
    it('rejects parent directory remediation targets', async () => {
      const result = await validateAnalyzeArtifacts('/feature', { remediationFiles: ['../src/main/index.ts'] });

      expect(result.ok).toBe(false);
      expect(result).toMatchObject({ kind: 'escape-hatch' });
      expect(vi.mocked(readFile)).not.toHaveBeenCalled();
    });
  });

  describe('source-code target', () => {
    it('rejects unrelated source files', async () => {
      const result = await validateAnalyzeArtifacts('/feature', { remediationFiles: ['src/main/index.ts'] });

      expect(result.ok).toBe(false);
      expect(result).toMatchObject({ kind: 'escape-hatch' });
      expect(vi.mocked(readFile)).not.toHaveBeenCalled();
    });
  });
});
