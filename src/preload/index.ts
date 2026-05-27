import { contextBridge, ipcRenderer } from 'electron';

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
  },
  steps: {
    read: (request: unknown) => ipcRenderer.invoke('steps:read', request) as Promise<unknown>
  },
  preferences: {
    read: (request: unknown) => ipcRenderer.invoke('preferences:read', request) as Promise<unknown>,
    write: (request: unknown) => ipcRenderer.invoke('preferences:write', request) as Promise<unknown>
  },
  auth: {
    status: (request: unknown) => ipcRenderer.invoke('auth:status', request) as Promise<unknown>
  },
  session: {
    listAcp: (request: unknown) => ipcRenderer.invoke('session:listAcp', request) as Promise<unknown>,
    createAcp: (request: unknown) => ipcRenderer.invoke('session:createAcp', request) as Promise<unknown>
  },
  activity: {
    read: (request: unknown) => ipcRenderer.invoke('activity:read', request) as Promise<unknown>
  }
});
