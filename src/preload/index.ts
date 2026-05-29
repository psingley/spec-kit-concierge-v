import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

const subscribeStepStream = (
  channel: string,
  subscriptionId: string,
  callback: (event: unknown) => void
): (() => void) => {
  const eventChannel = `${channel}:event`;
  const listener = (_event: IpcRendererEvent, payload: unknown): void => {
    if (typeof payload === 'object' && payload !== null && 'subscriptionId' in payload) {
      const envelope = payload as { subscriptionId?: unknown; event?: unknown };
      if (envelope.subscriptionId === subscriptionId) {
        callback(envelope.event);
      }
    }
  };
  ipcRenderer.on(eventChannel, listener);
  return () => {
    ipcRenderer.off(eventChannel, listener);
  };
};

contextBridge.exposeInMainWorld('concierge', {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<unknown>
  },
  acp: {
    probeBoundCLI: () => ipcRenderer.invoke('acp:probeBoundCLI') as Promise<unknown>
  },
  workspace: {
    read: (request: unknown) => ipcRenderer.invoke('workspace:read', request) as Promise<unknown>
  },
  git: {
    read: (request: unknown) => ipcRenderer.invoke('git:read', request) as Promise<unknown>
    ,
    checkout: (request: unknown) => ipcRenderer.invoke('git:checkout', request) as Promise<unknown>,
    createDraft: (request: unknown) => ipcRenderer.invoke('git:createDraft', request) as Promise<unknown>
  },
  steps: {
    read: (request: unknown) => ipcRenderer.invoke('steps:read', request) as Promise<unknown>
  },
  preferences: {
    read: (request: unknown) => ipcRenderer.invoke('preferences:read', request) as Promise<unknown>,
    write: (request: unknown) => ipcRenderer.invoke('preferences:write', request) as Promise<unknown>
  },
  auth: {
    status: (request: unknown) => ipcRenderer.invoke('auth:status', request) as Promise<unknown>,
    loginGitHub: (request: unknown) => ipcRenderer.invoke('auth:gh:login', request) as Promise<unknown>,
    loginCopilot: (request: unknown) => ipcRenderer.invoke('auth:copilot:login', request) as Promise<unknown>,
    loginAtlassian: (request: unknown) => ipcRenderer.invoke('auth:atlassian:login', request) as Promise<unknown>
  },
  session: {
    listAcp: (request: unknown) => ipcRenderer.invoke('session:listAcp', request) as Promise<unknown>,
    createAcp: (request: unknown) => ipcRenderer.invoke('session:createAcp', request) as Promise<unknown>
  },
  activity: {
    read: (request: unknown) => ipcRenderer.invoke('activity:read', request) as Promise<unknown>
  },
  repos: {
    list: (request: unknown) => ipcRenderer.invoke('repos:list', request) as Promise<unknown>
  },
  branches: {
    sessions: (request: unknown) => ipcRenderer.invoke('branches:sessions', request) as Promise<unknown>
  },
  artifacts: {
    read: (request: unknown) => ipcRenderer.invoke('artifacts:read', request) as Promise<unknown>
  },
  copilot: {
    specify: (request: unknown) => ipcRenderer.invoke('copilot:specify', request) as Promise<unknown>,
    clarify: (request: unknown) => ipcRenderer.invoke('copilot:clarify', request) as Promise<unknown>,
    subscribeStepStream,
    subscribeSpecify: (subscriptionId: string, callback: (event: unknown) => void): (() => void) =>
      subscribeStepStream('copilot:specify', subscriptionId, callback)
  }
});
