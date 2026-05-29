import { app, type IpcMain } from 'electron';
import { beforePlanHook } from '../hooks/beforePlan.hook';
import { afterPlanHook } from '../hooks/afterPlan.hook';
import type { MainLogger } from '../logging';
import { createPassiveCopilotAgentAdapter } from './copilotPassiveAgent';
import { registerPassiveStepIpc, type PassiveStepAgentAdapter } from './passiveStepIpc';

export const COPILOT_PLAN_CHANNEL = 'copilot:plan';
export const COPILOT_PLAN_EVENT_CHANNEL = 'copilot:plan:event';

export type RegisterCopilotPlanIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath?: string;
  agentAdapter?: PassiveStepAgentAdapter;
};

export const registerCopilotPlanIpc = ({
  ipcMain,
  logger,
  userDataPath = app.getPath('userData'),
  agentAdapter = createPassiveCopilotAgentAdapter(logger, userDataPath)
}: RegisterCopilotPlanIpcOptions): void => {
  registerPassiveStepIpc({
    step: 'plan',
    channel: COPILOT_PLAN_CHANNEL,
    eventChannel: COPILOT_PLAN_EVENT_CHANNEL,
    ipcMain,
    logger,
    userDataPath,
    beforeHook: beforePlanHook,
    afterHook: afterPlanHook,
    agentAdapter
  });
};
