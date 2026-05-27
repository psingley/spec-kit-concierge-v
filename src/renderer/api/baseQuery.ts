import type { BaseQueryFn } from '@reduxjs/toolkit/query';

export type IpcQueryArgs = {
  channel: 'app:getVersion';
};

export type IpcQueryError = {
  status: 'IPC_ERROR';
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
    }
  } catch (error) {
    return {
      error: toIpcError(error)
    };
  }
};
