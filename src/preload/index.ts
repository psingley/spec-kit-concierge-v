import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('concierge', {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<unknown>
  }
});
