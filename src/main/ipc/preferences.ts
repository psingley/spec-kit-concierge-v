import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { app, type IpcMain } from 'electron';
import { safeWrite } from '../data-layer/fs/safeWrite';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
import {
  createPreferencesPayload,
  createPreferencesReadRequest,
  createPreferencesWriteRequest,
  type PreferencesPayload,
  type PreferencesReadRequest,
  type PreferencesWriteRequest
} from './preferences.factory';

export const PREFERENCES_READ_CHANNEL = 'preferences:read';
export const PREFERENCES_WRITE_CHANNEL = 'preferences:write';

export type RegisterPreferencesIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  readPreferences?: (request: PreferencesReadRequest) => Promise<PreferencesPayload>;
  writePreferences?: (request: PreferencesWriteRequest) => Promise<PreferencesPayload>;
  now?: () => number;
  userDataPath?: string;
};

const preferencesPath = (userDataPath: string): string => path.join(userDataPath, 'preferences.json');

export const registerPreferencesIpc = ({
  ipcMain,
  logger,
  readPreferences,
  writePreferences,
  now = () => performance.now(),
  userDataPath = app.getPath('userData')
}: RegisterPreferencesIpcOptions): void => {
  const read =
    readPreferences ??
    (async (): Promise<PreferencesPayload> => {
      const parsed = JSON.parse(await readFile(preferencesPath(userDataPath), 'utf8')) as unknown;
      const result = createPreferencesPayload(parsed);
      if (!result.ok) {
        throw toError(result.error.message);
      }

      return result.value;
    });
  const write =
    writePreferences ??
    (async (request: PreferencesWriteRequest): Promise<PreferencesPayload> => {
      const payload: PreferencesPayload = { hydratedFromDisk: true, ...request };
      await safeWrite(
        {
          targetPath: preferencesPath(userDataPath),
          contents: `${JSON.stringify(payload, null, 2)}\n`,
          stepContext: { stepId: 'preferences-write', label: 'Persist preferences' }
        },
        logger
      );

      return payload;
    });

  ipcMain.handle(PREFERENCES_READ_CHANNEL, async (event, ...args: unknown[]): Promise<PreferencesPayload> => {
    const startedAt = now();
    const context = getSenderContext(event);

    try {
      const request = createPreferencesReadRequest(assertOnePayload(PREFERENCES_READ_CHANNEL, args));
      if (!request.ok) {
        throw toError(request.error.message);
      }
      const response = createPreferencesPayload(await read(request.value));
      if (!response.ok) {
        throw toError(response.error.message);
      }
      logger.info({ channel: PREFERENCES_READ_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');

      return response.value;
    } catch (error) {
      logger.error({ channel: PREFERENCES_READ_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      throw error;
    }
  });

  ipcMain.handle(PREFERENCES_WRITE_CHANNEL, async (event, ...args: unknown[]): Promise<PreferencesPayload> => {
    const startedAt = now();
    const context = getSenderContext(event);

    try {
      const request = createPreferencesWriteRequest(assertOnePayload(PREFERENCES_WRITE_CHANNEL, args));
      if (!request.ok) {
        throw toError(request.error.message);
      }
      const response = createPreferencesPayload(await write(request.value));
      if (!response.ok) {
        throw toError(response.error.message);
      }
      logger.info({ channel: PREFERENCES_WRITE_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');

      return response.value;
    } catch (error) {
      logger.error({ channel: PREFERENCES_WRITE_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      throw error;
    }
  });
};
