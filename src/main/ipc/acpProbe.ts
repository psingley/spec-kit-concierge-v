import { app, type IpcMain } from 'electron';
import { loadAgentManifest } from '../data-layer/agents/loader';
import { BoundCLISupervisor } from '../data-layer/acp/supervisor';
import type { BoundCLICapabilities } from '../data-layer/acp/types';
import type { MainLogger } from '../logging';

export const ACP_PROBE_BOUND_CLI_CHANNEL = 'acp:probeBoundCLI';

type AcpProbeSession = {
  capabilities: BoundCLICapabilities;
  dispose(): Promise<unknown>;
};

type AcpProbeSupervisor = {
  start(): Promise<AcpProbeSession>;
};

export type RegisterAcpProbeIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  supervisorFactory?: () => Promise<AcpProbeSupervisor>;
  now?: () => number;
  userDataPath?: string;
};

export const registerAcpProbeIpc = ({
  ipcMain,
  logger,
  supervisorFactory,
  now = () => performance.now(),
  userDataPath = app.getPath('userData')
}: RegisterAcpProbeIpcOptions): void => {
  ipcMain.handle(ACP_PROBE_BOUND_CLI_CHANNEL, async (event, ...args: unknown[]): Promise<BoundCLICapabilities> => {
    const startedAt = now();
    const context = { senderId: event.sender.id };

    let session: AcpProbeSession | undefined;

    try {
      // Param validation lives INSIDE the try block so its failures still
      // emit the structured-failure log per FR-024 (every invocation logs).
      if (args.length > 0) {
        throw new Error('acp:probeBoundCLI does not accept parameters.');
      }

      logger.info({ channel: ACP_PROBE_BOUND_CLI_CHANNEL, context }, 'ipc handler invocation');
      const supervisor =
        supervisorFactory === undefined
          ? await (async () => {
              const manifest = await loadAgentManifest(logger);
              const copilot = manifest.agents.copilot;
              if (copilot === undefined) {
                throw new Error('Copilot bound CLI manifest entry is missing.');
              }

              return new BoundCLISupervisor({ agent: copilot, logger, userDataPath });
            })()
          : await supervisorFactory();
      session = await supervisor.start();
      const latencyMs = Math.round((now() - startedAt) * 1000) / 1000;
      logger.info(
        { channel: ACP_PROBE_BOUND_CLI_CHANNEL, context, success: true, latencyMs },
        'ipc handler invocation'
      );
      return session.capabilities;
    } catch (error) {
      const latencyMs = Math.round((now() - startedAt) * 1000) / 1000;
      logger.error(
        { channel: ACP_PROBE_BOUND_CLI_CHANNEL, context, success: false, latencyMs, error },
        'ipc handler invocation'
      );
      throw error;
    } finally {
      await session?.dispose();
    }
  });
};
