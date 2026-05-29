import { app, type IpcMain } from 'electron';
import { beforeAnalyzeHook } from '../hooks/beforeAnalyze.hook';
import { afterAnalyzeHook } from '../hooks/afterAnalyze.hook';
import type { MainLogger } from '../logging';
import { createPassiveCopilotAgentAdapter } from './copilotPassiveAgent';
import { registerPassiveStepIpc, type PassiveStepAgentAdapter } from './passiveStepIpc';

export const COPILOT_ANALYZE_CHANNEL = 'copilot:analyze';
export const COPILOT_ANALYZE_EVENT_CHANNEL = 'copilot:analyze:event';

export type RegisterCopilotAnalyzeIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath?: string;
  agentAdapter?: PassiveStepAgentAdapter;
};

export const registerCopilotAnalyzeIpc = ({
  ipcMain,
  logger,
  userDataPath = app.getPath('userData'),
  agentAdapter = createPassiveCopilotAgentAdapter(logger, userDataPath)
}: RegisterCopilotAnalyzeIpcOptions): void => {
  registerPassiveStepIpc({
    step: 'analyze',
    channel: COPILOT_ANALYZE_CHANNEL,
    eventChannel: COPILOT_ANALYZE_EVENT_CHANNEL,
    ipcMain,
    logger,
    userDataPath,
    beforeHook: beforeAnalyzeHook,
    afterHook: afterAnalyzeHook,
    agentAdapter
  });
};
