import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { api } from './api';
import { activityReducer } from './slices/activity';
import { authReducer } from './slices/auth';
import { copilotReducer } from './slices/copilot';
import { preferencesReducer } from './slices/preferences';
import { sessionReducer } from './slices/session';
import { stepsReducer } from './slices/steps';
import { uiReducer } from './slices/ui';
import { workspaceReducer } from './slices/workspace';
import { setupAcpStreamSubscriptionListener } from './listeners/acpStreamSubscription.listener';
import { setupActivityLoggerListener } from './listeners/activityLogger.listener';
import { setupNavigationListener } from './listeners/navigation.listener';
import { setupPreferencesPersistenceListener } from './listeners/preferencesPersistence.listener';
import { setupSessionLifecycleListener } from './listeners/sessionLifecycle.listener';
import { setupStepLifecycleListener } from './listeners/stepLifecycle.listener';
import { setupTranscriptCaptureListener } from './listeners/transcriptCapture.listener';
import { setupWorkspaceChangeListener } from './listeners/workspaceChange.listener';
import type { AppStartListening } from './listeners/types';
import type { createMemoryRouter } from 'react-router';
import { mcpConfigCheckRequested, setupMcpConfigCheckerListener } from './listeners/mcpConfigChecker.listener';

const reducer = {
  ui: uiReducer,
  preferences: preferencesReducer,
  auth: authReducer,
  workspace: workspaceReducer,
  steps: stepsReducer,
  session: sessionReducer,
  activity: activityReducer,
  copilot: copilotReducer,
  [api.reducerPath]: api.reducer
};

export const createProductStore = () => {
  const listenerMiddleware = createListenerMiddleware();
  const startListening = listenerMiddleware.startListening;

  setupAcpStreamSubscriptionListener(startListening);
  setupActivityLoggerListener(startListening);
  setupPreferencesPersistenceListener(startListening);
  setupSessionLifecycleListener(startListening);
  setupStepLifecycleListener(startListening);
  setupTranscriptCaptureListener(startListening);
  setupWorkspaceChangeListener(startListening);
  setupMcpConfigCheckerListener(startListening);

  const store = configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware).concat(api.middleware)
  });

  const productStore = Object.assign(store, {
    wireRouter: (router: ReturnType<typeof createMemoryRouter>) => {
      setupNavigationListener(startListening as unknown as AppStartListening, router);
    }
  });
  productStore.dispatch(mcpConfigCheckRequested({ reason: 'startup' }));
  return productStore;
};

export const store = createProductStore();

export type AppStore = ReturnType<typeof createProductStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
