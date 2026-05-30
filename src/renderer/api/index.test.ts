import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { api, RUN2_TAG_TYPES } from './index';
import { rendererVerifiedCapabilities } from './capabilities.factory.spec';

describe('renderer API slice', () => {
  it('exposes proof endpoints plus Run 4 and Run 6 bridge endpoints', () => {
    expect(Object.keys(api.endpoints)).toEqual([
      'getAppVersion',
      'getBoundCLICapabilities',
      'getWorkspace',
      'getGitState',
      'checkoutBranch',
      'createDraftBranch',
      'getStepState',
      'getPreferences',
      'writePreferences',
      'getAuthStatus',
      'loginGitHub',
      'loginCopilot',
      'loginAtlassianStub',
      'listAcpSessions',
      'createAcpSession',
      'getActivity',
      'listRepos',
      'listBranchSessions',
      'readArtifact',
      'getTasksDetail',
      'runSpecify',
      'runClarify',
      'runPassiveStep'
    ]);
  });

  it('dispatches getAppVersion successfully through the base query', async () => {
    window.concierge = {
      app: {
        getVersion: vi.fn(async () => ({ version: '0.1.0' }))
      },
      acp: {
        probeBoundCLI: vi.fn()
      }
    };
    const { store } = createRtkQueryTestStore(api);

    const result = await store.dispatch(api.endpoints.getAppVersion.initiate()).unwrap();

    expect(result).toEqual({ version: '0.1.0' });
  });

  it('preserves structured IPC failure results', async () => {
    window.concierge = {
      app: {
        getVersion: vi.fn(async () => {
          throw new Error('ipc failed');
        })
      },
      acp: {
        probeBoundCLI: vi.fn()
      }
    };
    const { store } = createRtkQueryTestStore(api);

    await expect(store.dispatch(api.endpoints.getAppVersion.initiate()).unwrap()).rejects.toEqual({
      status: 'IPC_ERROR',
      data: {
        name: 'Error',
        message: 'ipc failed'
      }
    });
  });

  it('declares the eight tag types exactly once', () => {
    expect(RUN2_TAG_TYPES).toEqual([
      'Workspace',
      'StepState',
      'GitState',
      'Agent',
      'Session',
      'Step',
      'Transcript',
      'Preferences'
    ]);
    expect(new Set(RUN2_TAG_TYPES).size).toBe(8);
  });

  it('dispatches getBoundCLICapabilities through the ACP preload bridge and validates the response first', async () => {
    window.concierge = {
      app: {
        getVersion: vi.fn()
      },
      acp: {
        probeBoundCLI: vi.fn(async () => rendererVerifiedCapabilities)
      }
    };
    const { store } = createRtkQueryTestStore(api);

    await expect(store.dispatch(api.endpoints.getBoundCLICapabilities.initiate()).unwrap()).resolves.toEqual(
      rendererVerifiedCapabilities
    );
    expect(window.concierge.acp.probeBoundCLI).toHaveBeenCalledTimes(1);
  });

  it('surfaces renderer capability factory failures as typed parsing errors', async () => {
    window.concierge = {
      app: {
        getVersion: vi.fn()
      },
      acp: {
        probeBoundCLI: vi.fn(async () => ({}))
      }
    };
    const { store } = createRtkQueryTestStore(api);

    await expect(store.dispatch(api.endpoints.getBoundCLICapabilities.initiate()).unwrap()).rejects.toEqual({
      status: 'PARSING_ERROR',
      data: {
        name: 'InvalidBoundCLICapabilities',
        message: 'protocolVersion must be a number'
      }
    });
  });

  it('preserves structured ACP IPC failures', async () => {
    window.concierge = {
      app: {
        getVersion: vi.fn()
      },
      acp: {
        probeBoundCLI: vi.fn(async () => {
          throw new Error('acp failed');
        })
      }
    };
    const { store } = createRtkQueryTestStore(api);

    await expect(store.dispatch(api.endpoints.getBoundCLICapabilities.initiate()).unwrap()).rejects.toEqual({
      status: 'IPC_ERROR',
      data: {
        name: 'Error',
        message: 'acp failed'
      }
    });
  });

  it('provides the fixed Agent tag for bound CLI capability proofs', () => {
    expect(api.endpoints.getBoundCLICapabilities).toHaveProperty('initiate');
    expect(RUN2_TAG_TYPES).toContain('Agent');
  });
});
