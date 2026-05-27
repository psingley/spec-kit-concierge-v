import type { BaseQueryFn } from '@reduxjs/toolkit/query';

export type IpcQueryArgs = {
  channel:
    | 'app:getVersion'
    | 'acp:probeBoundCLI'
    | 'workspace:read'
    | 'git:read'
    | 'steps:read'
    | 'preferences:read'
    | 'preferences:write'
    | 'auth:status'
    | 'session:listAcp'
    | 'session:createAcp'
    | 'activity:read';
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
      case 'steps:read':
        return { data: await window.concierge.steps!.read(args.payload) };
      case 'preferences:read':
        return { data: await window.concierge.preferences!.read(args.payload) };
      case 'preferences:write':
        return { data: await window.concierge.preferences!.write(args.payload) };
      case 'auth:status':
        return { data: await window.concierge.auth!.status(args.payload) };
      case 'session:listAcp':
        return { data: await window.concierge.session!.listAcp(args.payload) };
      case 'session:createAcp':
        return { data: await window.concierge.session!.createAcp(args.payload) };
      case 'activity:read':
        return { data: await window.concierge.activity!.read(args.payload) };
    }
  } catch (error) {
    return {
      error: toIpcError(error)
    };
  }
};
