import type { IpcMain } from 'electron';
import { parseConciergeStepTrailer } from '../data-layer/git/trailers';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, toError } from './handlerUtils';
import {
  createStepsReadRequest,
  createStepsReadResponse,
  type StepReadRequest,
  type StepReadResponse
} from './steps.factory';

export const STEPS_READ_CHANNEL = 'steps:read';

export type RegisterStepsIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  readSteps?: (request: StepReadRequest) => Promise<StepReadResponse>;
  now?: () => number;
};

export const registerStepsIpc = ({
  ipcMain,
  logger,
  readSteps,
  now = () => performance.now()
}: RegisterStepsIpcOptions): void => {
  const read =
    readSteps ??
    (async (request: StepReadRequest): Promise<StepReadResponse> => ({
      steps: request.commits.flatMap((commit) => {
        const trailer = parseConciergeStepTrailer(commit.message, { commitSha: commit.sha, logger });
        if (!trailer.found) {
          return [];
        }

        return [
          {
            id: trailer.step,
            status: trailer.status,
            commitSha: commit.sha,
            interpretation: trailer.interpretation,
            warnings: trailer.warnings
          }
        ];
      })
    }));

  ipcMain.handle(STEPS_READ_CHANNEL, async (event, ...args: unknown[]): Promise<StepReadResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);

    try {
      const request = createStepsReadRequest(assertOnePayload(STEPS_READ_CHANNEL, args));
      if (!request.ok) {
        throw toError(request.error.message);
      }
      const response = createStepsReadResponse(await read(request.value));
      if (!response.ok) {
        throw toError(response.error.message);
      }
      logger.info({ channel: STEPS_READ_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');

      return response.value;
    } catch (error) {
      logHandlerError(logger, { channel: STEPS_READ_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });
};
