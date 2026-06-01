import type { IpcMain } from 'electron';
import { resolveFeatureDir } from '../data-layer/specify/featureDir';
import { buildReviewEvidence, readReviewEvidenceBody } from '../domain/reviewEvidence';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, toError } from './handlerUtils';
import { createReviewEvidenceRequest, createReviewEvidenceResponse, type ReviewEvidenceResponse } from './reviewEvidence.factory';

export const REVIEW_EVIDENCE_CHANNEL = 'review:evidence';

export type RegisterReviewEvidenceIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  userDataPath: string;
  now?: () => number;
  resolveFeatureDir?: (repositoryPath: string) => Promise<string>;
};

export const registerReviewEvidenceIpc = ({
  ipcMain,
  logger,
  userDataPath,
  now = () => performance.now(),
  resolveFeatureDir: resolveDir = resolveFeatureDir
}: RegisterReviewEvidenceIpcOptions): void => {
  ipcMain.handle(REVIEW_EVIDENCE_CHANNEL, async (event, ...args: unknown[]): Promise<ReviewEvidenceResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createReviewEvidenceRequest(assertOnePayload(REVIEW_EVIDENCE_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      // feature.json is the single source of truth for the feature dir; resolve it
      // server-side so the renderer never derives it (e.g. from the branch name).
      const featureDir = await resolveDir(request.value.repositoryPath);
      const response = createReviewEvidenceResponse(request.value.mode === 'body'
        ? await readReviewEvidenceBody({ ...request.value, featureDir, userDataPath })
        : await buildReviewEvidence({
          repositoryPath: request.value.repositoryPath,
          featureDir,
          userDataPath
        }));
      if (!response.ok) throw toError(response.error.message);
      logger.info({ channel: REVIEW_EVIDENCE_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return response.value;
    } catch (error) {
      logHandlerError(logger, { channel: REVIEW_EVIDENCE_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });
};
