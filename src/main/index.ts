import path from 'node:path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { loadAgentManifest } from './data-layer/agents/loader';
import { registerAppVersionIpc } from './ipc/appVersion';
import { registerAcpProbeIpc } from './ipc/acpProbe';
import { registerActivityIpc } from './ipc/activity';
import { registerAuthIpc } from './ipc/auth';
import { registerGitIpc } from './ipc/git';
import { registerPreferencesIpc } from './ipc/preferences';
import { registerSessionIpc } from './ipc/session';
import { registerStepsIpc } from './ipc/steps';
import { registerWorkspaceIpc } from './ipc/workspace';
import { createMainLogger, type MainLogger } from './logging';

const createWindow = (logger: MainLogger): BrowserWindow => {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: 'Spec-kit Concierge',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  logger.info('main window created');

  return mainWindow;
};

app.whenReady().then(async () => {
  const logger = createMainLogger();
  logger.info('app ready');

  await loadAgentManifest(logger);
  registerAppVersionIpc({ ipcMain, logger });
  registerAcpProbeIpc({ ipcMain, logger });
  registerWorkspaceIpc({ ipcMain, logger });
  registerGitIpc({ ipcMain, logger });
  registerStepsIpc({ ipcMain, logger });
  registerPreferencesIpc({ ipcMain, logger });
  registerAuthIpc({ ipcMain, logger });
  registerSessionIpc({ ipcMain, logger });
  registerActivityIpc({ ipcMain, logger });
  createWindow(logger);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(logger);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
