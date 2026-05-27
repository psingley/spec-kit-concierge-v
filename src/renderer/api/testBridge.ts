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
      read: vi.fn()
    },
    steps: {
      read: vi.fn()
    },
    preferences: {
      read: vi.fn(),
      write: vi.fn()
    },
    auth: {
      status: vi.fn()
    },
    session: {
      listAcp: vi.fn(),
      createAcp: vi.fn()
    },
    activity: {
      read: vi.fn()
    },
    ...overrides
  };
};
