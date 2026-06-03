import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { authApi } from './auth.endpoint';
import { rendererAuthStatus } from './auth.factory.spec';
import { installConciergeBridge } from './testBridge';
import { api } from './rootApi';
import { authReducer } from '../slices/auth';
import { uiReducer } from '../slices/ui';

const createFullAuthStore = () =>
  configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      auth: authReducer,
      ui: uiReducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware)
  });

describe('auth endpoint', () => {
  it('reads auth status through preload and validates nullable booleans', async () => {
    installConciergeBridge({ auth: { status: vi.fn(async () => rendererAuthStatus) } });
    const { store } = createRtkQueryTestStore(authApi);

    await expect(store.dispatch(authApi.endpoints.getAuthStatus.initiate({ providers: ['copilot', 'github'] })).unwrap()).resolves.toEqual(rendererAuthStatus);
    expect(window.concierge.auth!.status).toHaveBeenCalledWith({ providers: ['copilot', 'github'] });
  });

  it('surfaces renderer factory failures', async () => {
    installConciergeBridge({ auth: { status: vi.fn(async () => ({ copilotLoggedIn: 'yes', githubLoggedIn: null })) } });
    const { store } = createRtkQueryTestStore(authApi);

    await expect(store.dispatch(authApi.endpoints.getAuthStatus.initiate({ providers: ['copilot'] })).unwrap()).rejects.toMatchObject({
      status: 'PARSING_ERROR',
      data: { name: 'InvalidAuthStatus' }
    });
  });

  describe('login error handling', () => {
    it('dispatches authLoginFailed and toastShown when GitHub login IPC rejects', async () => {
      installConciergeBridge({
        auth: {
          status: vi.fn(),
          loginGitHub: vi.fn(async () => { throw new Error('gh not found'); }),
          loginCopilot: vi.fn(),
          loginAtlassian: vi.fn()
        }
      });
      const store = createFullAuthStore();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await store.dispatch(authApi.endpoints.loginGitHub.initiate()).unwrap().catch(() => {});

      expect(store.getState().auth.github).toBe('error');
      expect(store.getState().auth.lastError).toContain('gh not found');
      expect(store.getState().ui.toasts).toHaveLength(1);
      expect(store.getState().ui.toasts[0]).toMatchObject({
        level: 'error',
        message: expect.stringContaining('GitHub sign-in failed')
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('dispatches authLoginFailed and toastShown when Copilot login IPC rejects', async () => {
      installConciergeBridge({
        auth: {
          status: vi.fn(),
          loginGitHub: vi.fn(),
          loginCopilot: vi.fn(async () => { throw new Error('copilot unavailable'); }),
          loginAtlassian: vi.fn()
        }
      });
      const store = createFullAuthStore();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await store.dispatch(authApi.endpoints.loginCopilot.initiate()).unwrap().catch(() => {});

      expect(store.getState().auth.copilot).toBe('locked');
      expect(store.getState().auth.lastError).toContain('copilot unavailable');
      expect(store.getState().ui.toasts).toHaveLength(1);
      expect(store.getState().ui.toasts[0]).toMatchObject({
        level: 'error',
        message: expect.stringContaining('Copilot sign-in failed')
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  it('passes the Copilot login stream subscription id through the auth IPC request', async () => {
    installConciergeBridge({
      auth: {
        status: vi.fn(),
        loginGitHub: vi.fn(),
        loginCopilot: vi.fn(async () => ({ status: 'ok', provider: 'copilot', label: 'Copilot CLI ready' })),
        loginAtlassian: vi.fn()
      }
    });
    const store = createFullAuthStore();

    await expect(store.dispatch(authApi.endpoints.loginCopilot.initiate({ subscriptionId: 'auth-sub-1' })).unwrap()).resolves.toEqual({
      status: 'ok',
      provider: 'copilot',
      label: 'Copilot CLI ready'
    });

    expect(window.concierge.auth!.loginCopilot).toHaveBeenCalledWith({ provider: 'copilot', subscriptionId: 'auth-sub-1' });
  });
});
