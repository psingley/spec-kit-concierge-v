import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { IpcMain } from 'electron';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, toError } from './handlerUtils';
import { createArtifactReadRequest, createArtifactReadResponse, type ArtifactReadResponse } from './artifacts.factory';

export const ARTIFACTS_READ_CHANNEL = 'artifacts:read';

export type RegisterArtifactsIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  now?: () => number;
};

export const registerArtifactsIpc = ({
  ipcMain,
  logger,
  now = () => performance.now()
}: RegisterArtifactsIpcOptions): void => {
  ipcMain.handle(ARTIFACTS_READ_CHANNEL, async (event, ...args: unknown[]): Promise<ArtifactReadResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createArtifactReadRequest(assertOnePayload(ARTIFACTS_READ_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const absolutePath = path.join(request.value.repositoryPath, request.value.artifactPath);
      const metadata = await stat(absolutePath);
      if (metadata.size > 512 * 1024) {
        throw new Error('Artifact is too large to read.');
      }
      const response = createArtifactReadResponse({
        artifactPath: request.value.artifactPath,
        text: await readFile(absolutePath, 'utf8'),
        size: metadata.size,
        mtimeMs: metadata.mtimeMs
      });
      if (!response.ok) throw toError(response.error.message);
      logger.info({ channel: ARTIFACTS_READ_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return response.value;
    } catch (error) {
      logHandlerError(logger, { channel: ARTIFACTS_READ_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });
};
