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
        auth: { loginGitHub: vi.fn(async () => { throw new Error('gh not found'); }) }
      });
      const store = createFullAuthStore();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await store.dispatch(authApi.endpoints.loginGitHub.initiate()).unwrap().catch(() => {});

      const state = store.getState();
      expect(state.auth.github).toBe('error');
      expect(state.auth.lastError).toContain('gh not found');
      expect(state.ui.toasts).toHaveLength(1);
      expect(state.ui.toasts[0]!.level).toBe('error');
      expect(state.ui.toasts[0]!.message).toContain('GitHub sign-in failed');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('dispatches authLoginFailed and toastShown when Copilot login IPC rejects', async () => {
      installConciergeBridge({
        auth: { loginCopilot: vi.fn(async () => { throw new Error('copilot unavailable'); }) }
      });
      const store = createFullAuthStore();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await store.dispatch(authApi.endpoints.loginCopilot.initiate()).unwrap().catch(() => {});

      const state = store.getState();
      // Copilot goes back to 'locked' when github isn't 'ok'
      expect(state.auth.copilot).toBe('locked');
      expect(state.auth.lastError).toContain('copilot unavailable');
      expect(state.ui.toasts).toHaveLength(1);
      expect(state.ui.toasts[0]!.level).toBe('error');
      expect(state.ui.toasts[0]!.message).toContain('Copilot sign-in failed');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('dispatches authLoginFailed and toastShown when Atlassian login IPC rejects', async () => {
      installConciergeBridge({
        auth: { loginAtlassian: vi.fn(async () => { throw new Error('network timeout'); }) }
      });
      const store = createFullAuthStore();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await store.dispatch(authApi.endpoints.loginAtlassianStub.initiate()).unwrap().catch(() => {});

      const state = store.getState();
      expect(state.auth.atlassian).toBe('error');
      expect(state.auth.lastError).toContain('network timeout');
      expect(state.ui.toasts).toHaveLength(1);
      expect(state.ui.toasts[0]!.level).toBe('error');
      expect(state.ui.toasts[0]!.message).toContain('Atlassian sign-in failed');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
