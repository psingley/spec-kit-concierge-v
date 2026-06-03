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
    resetMain: (request: unknown) => ipcRenderer.invoke('git:resetMain', request) as Promise<unknown>
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
    loginAtlassian: (request: unknown) => ipcRenderer.invoke('auth:atlassian:login', request) as Promise<unknown>,
    subscribeCopilotLogin: (subscriptionId: string, callback: (event: unknown) => void): (() => void) =>
      subscribeStepStream('auth:copilot:login', subscriptionId, callback)
  },
  mcpConfig: {
    check: (request: unknown) => ipcRenderer.invoke('mcp:config:check', request) as Promise<unknown>,
    fix: (request: unknown) => ipcRenderer.invoke('mcp:config:fix', request) as Promise<unknown>
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
  repo: {
    ensureLocal: (request: unknown) => ipcRenderer.invoke('repo:ensureLocal', request) as Promise<unknown>,
    startSession: (request: unknown) => ipcRenderer.invoke('repo:startSession', request) as Promise<unknown>,
    resumeSession: (request: unknown) => ipcRenderer.invoke('repo:resumeSession', request) as Promise<unknown>
  },
  branches: {
    sessions: (request: unknown) => ipcRenderer.invoke('branches:sessions', request) as Promise<unknown>
  },
  artifacts: {
    read: (request: unknown) => ipcRenderer.invoke('artifacts:read', request) as Promise<unknown>
  },
  tasksDetail: {
    read: (request: unknown) => ipcRenderer.invoke('tasks:detail', request) as Promise<unknown>
  },
  reviewEvidence: {
    read: (request: unknown) => ipcRenderer.invoke('review:evidence', request) as Promise<unknown>
  },
  jiraSubmission: {
    dryRun: (request: unknown) => ipcRenderer.invoke('jira:dryRun', request) as Promise<unknown>,
    submit: (request: unknown) => ipcRenderer.invoke('jira:submit', request) as Promise<unknown>,
    subscribeSubmit: (subscriptionId: string, callback: (event: unknown) => void): (() => void) =>
      subscribeStepStream('jira:submit', subscriptionId, callback)
  },
  jiraCredential: {
    save: (request: unknown) => ipcRenderer.invoke('jira:credential:save', request) as Promise<unknown>,
    clear: (request: unknown) => ipcRenderer.invoke('jira:credential:clear', request) as Promise<unknown>,
    state: (request: unknown) => ipcRenderer.invoke('jira:credential:state', request) as Promise<unknown>
  },
  jiraBoard: {
    get: (request: unknown) => ipcRenderer.invoke('jira:board:get', request) as Promise<unknown>,
    set: (request: unknown) => ipcRenderer.invoke('jira:board:set', request) as Promise<unknown>,
    suggest: (request: unknown) => ipcRenderer.invoke('jira:board:suggest', request) as Promise<unknown>,
    searchProjects: (request: unknown) => ipcRenderer.invoke('jira:project:search', request) as Promise<unknown>
  },
  sessionManifest: {
    read: (request: unknown) => ipcRenderer.invoke('sessionManifest:read', request) as Promise<unknown>,
    reconcile: (request: unknown) => ipcRenderer.invoke('sessionManifest:reconcile', request) as Promise<unknown>,
    auditTrail: (request: unknown) => ipcRenderer.invoke('sessionManifest:auditTrail', request) as Promise<unknown>,
    doctorStatus: (request: unknown) => ipcRenderer.invoke('sessionManifest:doctorStatus', request) as Promise<unknown>,
    nudge: (request: unknown) => ipcRenderer.invoke('sessionManifest:nudge', request) as Promise<unknown>
  },
  copilot: {
    specify: (request: unknown) => ipcRenderer.invoke('copilot:specify', request) as Promise<unknown>,
    clarify: (request: unknown) => ipcRenderer.invoke('copilot:clarify', request) as Promise<unknown>,
    plan: (request: unknown) => ipcRenderer.invoke('copilot:plan', request) as Promise<unknown>,
    tasks: (request: unknown) => ipcRenderer.invoke('copilot:tasks', request) as Promise<unknown>,
    analyze: (request: unknown) => ipcRenderer.invoke('copilot:analyze', request) as Promise<unknown>,
    subscribeStepStream,
    subscribeSpecify: (subscriptionId: string, callback: (event: unknown) => void): (() => void) =>
      subscribeStepStream('copilot:specify', subscriptionId, callback)
  }
});
