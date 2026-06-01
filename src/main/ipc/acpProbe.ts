import { app, type IpcMain } from 'electron';
import { readFile } from 'node:fs/promises';
import { loadAgentManifest } from '../data-layer/agents/loader';
import { createBoundCLICapabilities } from '../data-layer/acp/capabilities';
import { BoundCLISupervisor } from '../data-layer/acp/supervisor';
import type { BoundCLICapabilities, BoundCLINewSessionResult } from '../data-layer/acp/types';
import type { MainLogger } from '../logging';
import { logHandlerError } from './handlerUtils';

export const ACP_PROBE_BOUND_CLI_CHANNEL = 'acp:probeBoundCLI';

type AcpProbeSession = {
  capabilities: BoundCLICapabilities;
  newSession(cwd: string, mcpServers: never[]): Promise<BoundCLINewSessionResult>;
  dispose(): Promise<unknown>;
};

// The ACP `initialize` response does NOT carry availableModels/availableModes;
// those live on `session/new` (SessionModelState). Run a throwaway session/new
// during the probe and overlay its lists onto the initialize-derived
// capabilities so the renderer model picker is populated.
const mergeSessionState = (
  capabilities: BoundCLICapabilities,
  sessionState: BoundCLINewSessionResult
): BoundCLICapabilities => ({
  ...capabilities,
  models: {
    available: sessionState.availableModels,
    current: sessionState.currentModelId ?? capabilities.models.current
  },
  modes: {
    available: sessionState.availableModes,
    current: sessionState.currentModeId
  },
  configOptions: sessionState.configOptions
});

type AcpProbeSupervisor = {
  start(): Promise<AcpProbeSession>;
};

export type RegisterAcpProbeIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  supervisorFactory?: () => Promise<AcpProbeSupervisor>;
  capabilitiesAdapterPath?: string;
  now?: () => number;
  userDataPath?: string;
};

const loadCapabilitiesAdapter = async (adapterPath: string): Promise<BoundCLICapabilities> => {
  const parsed = createBoundCLICapabilities(JSON.parse(await readFile(adapterPath, 'utf8')));
  if (!parsed.ok) {
    throw new Error(parsed.error.message);
  }

  return parsed.value;
};

export const registerAcpProbeIpc = ({
  ipcMain,
  logger,
  supervisorFactory,
  capabilitiesAdapterPath = process.env.CONCIERGE_TEST_CAPABILITIES_ADAPTER,
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
      if (capabilitiesAdapterPath !== undefined && capabilitiesAdapterPath.length > 0) {
        const capabilities = await loadCapabilitiesAdapter(capabilitiesAdapterPath);
        const latencyMs = Math.round((now() - startedAt) * 1000) / 1000;
        logger.info(
          { channel: ACP_PROBE_BOUND_CLI_CHANNEL, context, success: true, latencyMs },
          'ipc handler invocation'
        );
        return capabilities;
      }

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
      // session/new requires a real workspace path; userData always exists.
      const sessionState = await session.newSession(userDataPath, []);
      const capabilities = mergeSessionState(session.capabilities, sessionState);
      const latencyMs = Math.round((now() - startedAt) * 1000) / 1000;
      logger.info(
        {
          channel: ACP_PROBE_BOUND_CLI_CHANNEL,
          context,
          success: true,
          latencyMs,
          modelCount: capabilities.models.available.length,
          currentModel: capabilities.models.current
        },
        'ipc handler invocation'
      );
      return capabilities;
    } catch (error) {
      logHandlerError(logger, { channel: ACP_PROBE_BOUND_CLI_CHANNEL, context, startedAt, now }, error);
      throw error;
    } finally {
      await session?.dispose();
    }
  });
};
