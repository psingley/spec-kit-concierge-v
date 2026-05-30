import { describe, expect, it, vi } from 'vitest';
import { buildReviewEvidence, parseClarifications, readReviewEvidenceBody } from './reviewEvidence';

describe('review evidence aggregation', () => {
  it('parses Run 7 clarification sessions from committed spec markdown', () => {
    expect(parseClarifications(`## Clarifications

### Session 2026-05-30

- Q: Who owns retries?
  - A: Concierge owns retries.
- Q: Should review commit?
  - A: No.

## Requirements
`)).toEqual([
      { session: '2026-05-30', question: 'Who owns retries?', answer: 'Concierge owns retries.' },
      { session: '2026-05-30', question: 'Should review commit?', answer: 'No.' }
    ]);
  });

  it('builds disk-only evidence from git trailers, committed files, and app-owned analyze index', async () => {
    const git = vi.fn(async (_repositoryPath: string, args: string[]) => {
      const command = args.join(' ');
      if (command.includes('cat-file -e plan-sha:specs/0009-review-evidence/data-model.md')) return '';
      if (command.includes('cat-file -e plan-sha:specs/0009-review-evidence/quickstart.md')) throw new Error('missing');
      if (command.includes('ls-tree -r --name-only plan-sha specs/0009-review-evidence/contracts')) {
        return 'specs/0009-review-evidence/contracts/review-evidence-ipc.md\n';
      }
      if (command.includes('show clarify-sha:specs/0009-review-evidence/spec.md')) {
        return `# Spec

## Clarifications

### Session 2026-05-30

- Q: Evidence source?
  - A: Disk only.
`;
      }
      throw new Error(`unexpected git call ${command}`);
    });
    const readFile = vi.fn(async () => JSON.stringify([
      {
        analyzeCommitSha: 'analyze-sha',
        reportPath: '/user/evidence/0009-review-evidence/analyze-session/analyze-report.md',
        extractionStatus: 'captured'
      }
    ]));

    const summary = await buildReviewEvidence({
      repositoryPath: '/repo',
      featureDir: '/repo/specs/0009-review-evidence',
      userDataPath: '/user'
    }, {
      readHistory: async () => [
        { step: 'analyze', status: 'pass', commitSha: 'analyze-sha', warnings: [] },
        { step: 'plan', status: 'pass', commitSha: 'plan-sha', warnings: [] },
        { step: 'clarify', status: 'pass', commitSha: 'clarify-sha', warnings: [] },
        { step: 'review', status: 'pass', commitSha: 'bad-review-sha', warnings: [] }
      ],
      git,
      readFile
    });

    expect(summary.steps.map((step) => step.step)).toEqual(['analyze', 'plan', 'clarify']);
    expect(summary.artifacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'plan.md', step: 'plan', required: true }),
      expect.objectContaining({ path: 'research.md', step: 'plan', required: true }),
      expect.objectContaining({ path: 'data-model.md', step: 'plan', required: false }),
      expect.objectContaining({ path: 'contracts/review-evidence-ipc.md', step: 'plan', required: false }),
      expect.objectContaining({ path: '/user/evidence/0009-review-evidence/analyze-session/analyze-report.md', step: 'analyze-report', required: false })
    ]));
    expect(summary.clarifications).toEqual([{ session: '2026-05-30', question: 'Evidence source?', answer: 'Disk only.' }]);
    expect(summary.analyzeReport).toMatchObject({ analyzeCommitSha: 'analyze-sha', extractionStatus: 'captured' });
  });

  it('reads app-owned analyze report bodies only inside the feature evidence root', async () => {
    const body = await readReviewEvidenceBody({
      repositoryPath: '/repo',
      featureDir: '/repo/specs/0009-review-evidence',
      userDataPath: '/user',
      artifactPath: '/user/evidence/0009-review-evidence/analyze-session/analyze-report.md'
    }, {
      stat: vi.fn(async () => ({ size: 9, mtimeMs: 12 })),
      readFile: vi.fn(async () => '# Analyze')
    });

    expect(body).toEqual({
      artifactPath: '/user/evidence/0009-review-evidence/analyze-session/analyze-report.md',
      text: '# Analyze',
      size: 9,
      mtimeMs: 12
    });

    await expect(readReviewEvidenceBody({
      repositoryPath: '/repo',
      featureDir: '/repo/specs/0009-review-evidence',
      userDataPath: '/user',
      artifactPath: '/tmp/other.md'
    })).rejects.toThrow(/outside/);
  });
});
