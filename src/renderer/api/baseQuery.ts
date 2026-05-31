import type { BaseQueryFn } from '@reduxjs/toolkit/query';

export type IpcQueryArgs = {
  channel:
    | 'app:getVersion'
    | 'acp:probeBoundCLI'
    | 'workspace:read'
    | 'git:read'
    | 'git:checkout'
    | 'git:createDraft'
    | 'steps:read'
    | 'preferences:read'
    | 'preferences:write'
    | 'auth:status'
    | 'auth:gh:login'
    | 'auth:copilot:login'
    | 'auth:atlassian:login'
    | 'mcp:config:check'
    | 'mcp:config:fix'
    | 'session:listAcp'
    | 'session:createAcp'
    | 'activity:read'
    | 'repos:list'
    | 'branches:sessions'
    | 'artifacts:read'
    | 'tasks:detail'
    | 'review:evidence'
    | 'copilot:specify'
    | 'copilot:clarify'
    | 'copilot:plan'
    | 'copilot:tasks'
    | 'copilot:analyze';
  payload?: unknown;
};

export type IpcQueryError = {
  status: 'IPC_ERROR' | 'PARSING_ERROR';
  data: {
    name: string;
    message: string;
  };
};

const toIpcError = (error: unknown): IpcQueryError => {
  if (error instanceof Error) {
    return {
      status: 'IPC_ERROR',
      data: {
        name: error.name,
        message: error.message
      }
    };
  }

  return {
    status: 'IPC_ERROR',
    data: {
      name: 'IpcError',
      message: String(error)
    }
  };
};

export const ipcBaseQuery: BaseQueryFn<IpcQueryArgs, unknown, IpcQueryError> = async (args) => {
  try {
    switch (args.channel) {
      case 'app:getVersion':
        return { data: await window.concierge.app.getVersion() };
      case 'acp:probeBoundCLI':
        return { data: await window.concierge.acp.probeBoundCLI() };
      case 'workspace:read':
        return { data: await window.concierge.workspace!.read(args.payload) };
      case 'git:read':
        return { data: await window.concierge.git!.read(args.payload) };
      case 'git:checkout':
        return { data: await window.concierge.git!.checkout!(args.payload) };
      case 'git:createDraft':
        return { data: await window.concierge.git!.createDraft!(args.payload) };
      case 'steps:read':
        return { data: await window.concierge.steps!.read(args.payload) };
      case 'preferences:read':
        return { data: await window.concierge.preferences!.read(args.payload) };
      case 'preferences:write':
        return { data: await window.concierge.preferences!.write(args.payload) };
      case 'auth:status':
        return { data: await window.concierge.auth!.status(args.payload) };
      case 'auth:gh:login':
        return { data: await window.concierge.auth!.loginGitHub!(args.payload) };
      case 'auth:copilot:login':
        return { data: await window.concierge.auth!.loginCopilot!(args.payload) };
      case 'auth:atlassian:login':
        return { data: await window.concierge.auth!.loginAtlassian!(args.payload) };
      case 'mcp:config:check':
        return { data: await window.concierge.mcpConfig!.check(args.payload) };
      case 'mcp:config:fix':
        return { data: await window.concierge.mcpConfig!.fix(args.payload) };
      case 'session:listAcp':
        return { data: await window.concierge.session!.listAcp(args.payload) };
      case 'session:createAcp':
        return { data: await window.concierge.session!.createAcp(args.payload) };
      case 'activity:read':
        return { data: await window.concierge.activity!.read(args.payload) };
      case 'repos:list':
        return { data: await window.concierge.repos!.list(args.payload) };
      case 'branches:sessions':
        return { data: await window.concierge.branches!.sessions(args.payload) };
      case 'artifacts:read':
        return { data: await window.concierge.artifacts!.read(args.payload) };
      case 'tasks:detail':
        return { data: await window.concierge.tasksDetail!.read(args.payload) };
      case 'review:evidence':
        return { data: await window.concierge.reviewEvidence!.read(args.payload) };
      case 'copilot:specify':
        return { data: await window.concierge.copilot!.specify(args.payload) };
      case 'copilot:clarify':
        return { data: await window.concierge.copilot!.clarify!(args.payload) };
      case 'copilot:plan':
        return { data: await window.concierge.copilot!.plan!(args.payload) };
      case 'copilot:tasks':
        return { data: await window.concierge.copilot!.tasks!(args.payload) };
      case 'copilot:analyze':
        return { data: await window.concierge.copilot!.analyze!(args.payload) };
    }
  } catch (error) {
    return {
      error: toIpcError(error)
    };
  }
};
