import type { IpcMain } from 'electron';
import type { MainLogger } from '../logging';
import packageJson from '../../../package.json';
import { createAppVersionPayload, type AppVersionPayload } from './appVersion.factory';

export const APP_GET_VERSION_CHANNEL = 'app:getVersion';

export type RegisterAppVersionIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  packageVersion?: string;
};

export const registerAppVersionIpc = ({
  ipcMain,
  logger,
  packageVersion = packageJson.version
}: RegisterAppVersionIpcOptions): void => {
  ipcMain.handle(APP_GET_VERSION_CHANNEL, async (event): Promise<AppVersionPayload> => {
    const startedAt = performance.now();
    const context = {
      senderId: event.sender.id
    };

    try {
      const result = createAppVersionPayload({ version: packageVersion });
      const latencyMs = Math.round((performance.now() - startedAt) * 1000) / 1000;

      if (!result.ok) {
        throw new Error(result.error.message);
      }

      logger.info(
        {
          channel: APP_GET_VERSION_CHANNEL,
          context,
          success: true,
          latencyMs
        },
        'ipc handler invocation'
      );

      return result.value;
    } catch (error) {
      const latencyMs = Math.round((performance.now() - startedAt) * 1000) / 1000;

      logger.error(
        {
          channel: APP_GET_VERSION_CHANNEL,
          context,
          success: false,
          latencyMs,
          error
        },
        'ipc handler invocation'
      );
      throw error;
    }
  });
};
