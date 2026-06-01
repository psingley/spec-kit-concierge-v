import type { IpcMain } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { registerReviewEvidenceIpc, REVIEW_EVIDENCE_CHANNEL } from './reviewEvidence';

vi.mock('../domain/reviewEvidence', () => ({
  buildReviewEvidence: vi.fn(async () => ({
    featureDir: '/repo/specs/0009',
    steps: [],
    artifacts: [],
    clarifications: [],
    analyzeReport: null
  })),
  readReviewEvidenceBody: vi.fn(async () => ({
    artifactPath: '/user/evidence/0009/analyze/analyze-report.md',
    text: '# Analyze',
    size: 9,
    mtimeMs: 10
  }))
}));

const { buildReviewEvidence, readReviewEvidenceBody } = await import('../domain/reviewEvidence');

describe('registerReviewEvidenceIpc', () => {
  it('registers review:evidence and delegates aggregation with app-owned userData', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>) => {
        handlers.set(channel, handler);
      })
    };
    const logger = { info: vi.fn(), error: vi.fn() };

    registerReviewEvidenceIpc({
      ipcMain: ipcMain as unknown as Pick<IpcMain, 'handle'>,
      logger,
      userDataPath: '/user',
      now: () => 10,
      resolveFeatureDir: async () => '/repo/specs/0009'
    });

    await expect(handlers.get(REVIEW_EVIDENCE_CHANNEL)?.(
      { sender: { id: 1 } },
      { repositoryPath: '/repo' }
    )).resolves.toMatchObject({ featureDir: '/repo/specs/0009' });
    expect(buildReviewEvidence).toHaveBeenCalledWith({ repositoryPath: '/repo', featureDir: '/repo/specs/0009', userDataPath: '/user' });
  });

  it('delegates body reads to the disk evidence reader', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>) => {
        handlers.set(channel, handler);
      })
    };
    const logger = { info: vi.fn(), error: vi.fn() };

    registerReviewEvidenceIpc({
      ipcMain: ipcMain as unknown as Pick<IpcMain, 'handle'>,
      logger,
      userDataPath: '/user',
      now: () => 10,
      resolveFeatureDir: async () => '/repo/specs/0009'
    });

    await expect(handlers.get(REVIEW_EVIDENCE_CHANNEL)?.(
      { sender: { id: 1 } },
      {
        mode: 'body',
        repositoryPath: '/repo',
        artifactPath: '/user/evidence/0009/analyze/analyze-report.md'
      }
    )).resolves.toMatchObject({ text: '# Analyze' });
    expect(readReviewEvidenceBody).toHaveBeenCalledWith({
      repositoryPath: '/repo',
      featureDir: '/repo/specs/0009',
      userDataPath: '/user',
      mode: 'body',
      artifactPath: '/user/evidence/0009/analyze/analyze-report.md'
    });
  });
});
