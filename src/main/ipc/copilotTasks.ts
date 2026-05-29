import { app, type IpcMain } from 'electron';
import { beforeTasksHook } from '../hooks/beforeTasks.hook';
import { afterTasksHook } from '../hooks/afterTasks.hook';
import type { MainLogger } from '../logging';
import { createPassiveCopilotAgentAdapter } from './copilotPassiveAgent';
import { registerPassiveStepIpc, type PassiveStepAgentAdapter } from './passiveStepIpc';

export const COPILOT_TASKS_CHANNEL = 'copilot:tasks';
export const COPILOT_TASKS_EVENT_CHANNEL = 'copilot:tasks:event';

export type RegisterCopilotTasksIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath?: string;
  agentAdapter?: PassiveStepAgentAdapter;
};

export const registerCopilotTasksIpc = ({
  ipcMain,
  logger,
  userDataPath = app.getPath('userData'),
  agentAdapter = createPassiveCopilotAgentAdapter(logger, userDataPath)
}: RegisterCopilotTasksIpcOptions): void => {
  registerPassiveStepIpc({
    step: 'tasks',
    channel: COPILOT_TASKS_CHANNEL,
    eventChannel: COPILOT_TASKS_EVENT_CHANNEL,
    ipcMain,
    logger,
    userDataPath,
    beforeHook: beforeTasksHook,
    afterHook: afterTasksHook,
    agentAdapter
  });
};
