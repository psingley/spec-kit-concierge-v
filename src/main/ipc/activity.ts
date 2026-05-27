import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { app, type IpcMain } from 'electron';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
import {
  createActivityReadRequest,
  createActivityReadResponse,
  type ActivityLogEntry,
  type ActivityReadRequest,
  type ActivityReadResponse
} from './activity.factory';

export const ACTIVITY_READ_CHANNEL = 'activity:read';

export type RegisterActivityIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  readActivity?: (request: ActivityReadRequest) => Promise<ActivityReadResponse>;
  now?: () => number;
  userDataPath?: string;
};

const parseLogLine = (line: string, index: number): ActivityLogEntry | undefined => {
  if (line.trim().length === 0) {
    return undefined;
  }
  const parsed = JSON.parse(line) as Record<string, unknown>;
  const time = typeof parsed.time === 'number' ? new Date(parsed.time).toISOString() : new Date(0).toISOString();
  const level = typeof parsed.level === 'number' ? String(parsed.level) : 'info';
  const msg = typeof parsed.msg === 'string' ? parsed.msg : 'log entry';

  return {
    id: `${time}-${index}`,
    timestamp: time,
    level,
    message: msg
  };
};

export const registerActivityIpc = ({
  ipcMain,
  logger,
  readActivity,
  now = () => performance.now(),
  userDataPath = app.getPath('userData')
}: RegisterActivityIpcOptions): void => {
  const read =
    readActivity ??
    (async (request: ActivityReadRequest): Promise<ActivityReadResponse> => {
      const logDirectory = path.join(userDataPath, 'logs');
      const files = (await readdir(logDirectory))
        .filter((file) => file.endsWith('.log'))
        .sort()
        .slice(-3);
      const entries: ActivityLogEntry[] = [];

      for (const file of files) {
        const contents = await readFile(path.join(logDirectory, file), 'utf8');
        for (const line of contents.split(/\r?\n/)) {
          const entry = parseLogLine(line, entries.length);
          if (entry !== undefined) {
            entries.push(entry);
          }
        }
      }

      return { entries: entries.slice(-Math.min(request.limit, 256)), cap: 256 };
    });

  ipcMain.handle(ACTIVITY_READ_CHANNEL, async (event, ...args: unknown[]): Promise<ActivityReadResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);

    try {
      const request = createActivityReadRequest(assertOnePayload(ACTIVITY_READ_CHANNEL, args));
      if (!request.ok) {
        throw toError(request.error.message);
      }
      const response = createActivityReadResponse(await read(request.value));
      if (!response.ok) {
        throw toError(response.error.message);
      }
      logger.info({ channel: ACTIVITY_READ_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');

      return response.value;
    } catch (error) {
      logger.error({ channel: ACTIVITY_READ_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      throw error;
    }
  });
};
