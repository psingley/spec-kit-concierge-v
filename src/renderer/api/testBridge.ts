import { vi } from 'vitest';

export const installConciergeBridge = (overrides: Partial<ConciergePreloadBridge> = {}): void => {
  window.concierge = {
    app: {
      getVersion: vi.fn()
    },
    acp: {
      probeBoundCLI: vi.fn()
    },
    workspace: {
      read: vi.fn()
    },
    git: {
      read: vi.fn(),
      checkout: vi.fn(),
      resetMain: vi.fn()
    },
    steps: {
      read: vi.fn()
    },
    preferences: {
      read: vi.fn(),
      write: vi.fn()
    },
    auth: {
      status: vi.fn(),
      loginGitHub: vi.fn(),
      loginCopilot: vi.fn(),
      loginAtlassian: vi.fn()
    },
    mcpConfig: {
      check: vi.fn(),
      fix: vi.fn()
    },
    session: {
      listAcp: vi.fn(),
      createAcp: vi.fn()
    },
    activity: {
      read: vi.fn()
    },
    repos: {
      list: vi.fn()
    },
    repo: {
      ensureLocal: vi.fn(),
      startSession: vi.fn(),
      resumeSession: vi.fn()
    },
    branches: {
      sessions: vi.fn()
    },
    artifacts: {
      read: vi.fn()
    },
    tasksDetail: {
      read: vi.fn()
    },
    reviewEvidence: {
      read: vi.fn()
    },
    jiraSubmission: {
      dryRun: vi.fn(),
      submit: vi.fn(),
      subscribeSubmit: vi.fn(() => vi.fn())
    },
    sessionManifest: {
      read: vi.fn(),
      reconcile: vi.fn(),
      auditTrail: vi.fn(),
      doctorStatus: vi.fn(),
      nudge: vi.fn()
    },
    copilot: {
      specify: vi.fn(),
      subscribeStepStream: vi.fn(() => vi.fn()),
      subscribeSpecify: vi.fn(() => vi.fn())
    },
    ...overrides
  };
};
