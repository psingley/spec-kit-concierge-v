import path from 'node:path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { loadAgentManifest } from './data-layer/agents/loader';
import { registerAppVersionIpc } from './ipc/appVersion';
import { registerAcpProbeIpc } from './ipc/acpProbe';
import { registerActivityIpc } from './ipc/activity';
import { registerArtifactsIpc } from './ipc/artifacts';
import { registerAuthIpc } from './ipc/auth';
import { registerBranchesIpc } from './ipc/branches';
import { registerCopilotSpecifyIpc } from './ipc/copilotSpecify';
import { registerCopilotClarifyIpc } from './ipc/copilotClarify';
import { registerCopilotPlanIpc } from './ipc/copilotPlan';
import { registerCopilotTasksIpc } from './ipc/copilotTasks';
import { registerCopilotAnalyzeIpc } from './ipc/copilotAnalyze';
import { registerGitIpc } from './ipc/git';
import { registerEnsureLocalRepoIpc } from './ipc/ensureLocalRepo';
import { registerPreferencesIpc } from './ipc/preferences';
import { registerReposIpc } from './ipc/repos';
import { registerStartSessionIpc } from './ipc/startSession';
import { registerResumeSessionIpc } from './ipc/resumeSession';
import { registerSessionIpc } from './ipc/session';
import { registerStepsIpc } from './ipc/steps';
import { registerTasksDetailIpc } from './ipc/tasksDetail';
import { registerReviewEvidenceIpc } from './ipc/reviewEvidence';
import { registerWorkspaceIpc } from './ipc/workspace';
import { registerMcpConfigIpc } from './ipc/mcpConfig';
import { verifyAgentManifestDrift } from './hooks/driftVerifier';
import { createMainLogger, type MainLogger } from './logging';
import { createBackForwardBlocker } from './backForwardBlocker';

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

  mainWindow.webContents.on('before-input-event', createBackForwardBlocker());

  logger.info('main window created');

  return mainWindow;
};

app.whenReady().then(async () => {
  const logger = createMainLogger();
  logger.info('app ready');

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const { default: installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } = await import('electron-devtools-installer');
    try {
      await installExtension([REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS]);
      logger.info('React DevTools and Redux DevTools installed');
    } catch (error) {
      logger.warn({ error }, 'Failed to install DevTools extensions');
    }
  }

  await loadAgentManifest(logger);
  await verifyAgentManifestDrift({
    agentsDirectory: path.join(process.cwd(), '.github', 'agents'),
    logger
  });
  registerAppVersionIpc({ ipcMain, logger });
  registerAcpProbeIpc({ ipcMain, logger });
  registerWorkspaceIpc({ ipcMain, logger });
  registerGitIpc({ ipcMain, logger });
  registerReposIpc({ ipcMain, logger });
  registerStartSessionIpc({ ipcMain, logger });
  registerResumeSessionIpc({ ipcMain, logger });
  registerEnsureLocalRepoIpc({ ipcMain, logger, documentsRoot: app.getPath('documents') });
  registerBranchesIpc({ ipcMain, logger });
  registerArtifactsIpc({ ipcMain, logger });
  registerTasksDetailIpc({ ipcMain, logger });
  registerReviewEvidenceIpc({ ipcMain, logger, userDataPath: app.getPath('userData') });
  registerCopilotSpecifyIpc({ ipcMain, logger });
  registerCopilotClarifyIpc({ ipcMain, logger });
  registerCopilotPlanIpc({ ipcMain, logger });
  registerCopilotTasksIpc({ ipcMain, logger });
  registerCopilotAnalyzeIpc({ ipcMain, logger });
  registerStepsIpc({ ipcMain, logger });
  registerPreferencesIpc({ ipcMain, logger });
  registerMcpConfigIpc({ ipcMain, logger });
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
