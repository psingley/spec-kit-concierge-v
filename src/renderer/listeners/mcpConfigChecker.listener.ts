import { createAction } from '@reduxjs/toolkit';
import { mcpConfigApi } from '../api/mcpConfig.endpoint';
import { repositorySelected } from '../slices/workspace';
import type { AppStartListening, ListenerTopicDescriptor } from './types';

export const mcpConfigCheckerTopic: ListenerTopicDescriptor = {
  topic: 'mcpConfigChecker',
  owns: 'Copilot MCP config readiness checks'
};

export const mcpConfigCheckRequested = createAction<{ reason: 'startup' | 'workspace_repo_changed' }>(
  'mcpConfig/checkRequested'
);

const runCheck = async (reason: 'startup' | 'workspace_repo_changed', listenerApi: Parameters<Parameters<AppStartListening>[0]['effect']>[1]): Promise<void> => {
  listenerApi.cancelActiveListeners();
  await listenerApi.delay(250);
  const dispatch = listenerApi.dispatch as unknown as (action: unknown) => unknown;
  const status = await (dispatch(mcpConfigApi.endpoints.checkMcpConfig.initiate()) as { unwrap: () => Promise<{ state: string; isLegacyEndpoint: boolean }> }).unwrap();
  if (status.state === 'not_configured' || status.isLegacyEndpoint) {
    await (dispatch(mcpConfigApi.endpoints.fixMcpConfig.initiate({ reason })) as { unwrap: () => Promise<unknown> }).unwrap();
  }
};

export const setupMcpConfigCheckerListener = (startListening: AppStartListening): void => {
  startListening({
    actionCreator: mcpConfigCheckRequested,
    effect: async (action, listenerApi) => {
      await runCheck(action.payload.reason, listenerApi);
    }
  });
  startListening({
    actionCreator: repositorySelected,
    effect: async (_action, listenerApi) => {
      await runCheck('workspace_repo_changed', listenerApi);
    }
  });
};
