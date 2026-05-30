import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { IpcMain } from 'electron';
import { parseTaskDetails } from '../domain/tasksDetail';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
import { createTasksDetailRequest, createTasksDetailResponse, type TasksDetailResponse } from './tasksDetail.factory';

export const TASKS_DETAIL_CHANNEL = 'tasks:detail';

export type RegisterTasksDetailIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  now?: () => number;
};

export const registerTasksDetailIpc = ({
  ipcMain,
  logger,
  now = () => performance.now()
}: RegisterTasksDetailIpcOptions): void => {
  ipcMain.handle(TASKS_DETAIL_CHANNEL, async (event, ...args: unknown[]): Promise<TasksDetailResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createTasksDetailRequest(assertOnePayload(TASKS_DETAIL_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const absolutePath = path.join(request.value.repositoryPath, request.value.artifactPath);
      const metadata = await stat(absolutePath);
      if (metadata.size > 512 * 1024) {
        throw new Error('Artifact is too large to read.');
      }
      const response = createTasksDetailResponse({
        tasks: parseTaskDetails(await readFile(absolutePath, 'utf8'))
      });
      if (!response.ok) throw toError(response.error.message);
      logger.info({ channel: TASKS_DETAIL_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return response.value;
    } catch (error) {
      logger.error({ channel: TASKS_DETAIL_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      throw error;
    }
  });
};
