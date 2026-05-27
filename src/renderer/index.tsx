import { createRoot } from 'react-dom/client';
import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Renderer root element was not found.');
}

const root = createRoot(rootElement);
const proofStore = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware)
});

type ProofState = {
  version: string | null;
  agentVersion: string | null;
  model: string | null;
};

const proofState: ProofState = {
  version: null,
  agentVersion: null,
  model: null
};

const renderProof = (): void => {
  root.render(
    <>
      {proofState.version === null ? null : (
        <span data-testid="app-version-proof">{proofState.version}</span>
      )}
      {proofState.agentVersion === null ? null : (
        <span data-testid="bound-cli-proof">
          {proofState.agentVersion}:{proofState.model ?? 'unknown-model'}
        </span>
      )}
    </>
  );
};

renderProof();

void proofStore
  .dispatch(api.endpoints.getAppVersion.initiate())
  .unwrap()
  .then((payload) => {
    proofState.version = payload.version;
    renderProof();
  })
  .catch(() => {
    proofState.version = null;
    renderProof();
  });

void proofStore
  .dispatch(api.endpoints.getBoundCLICapabilities.initiate())
  .unwrap()
  .then((payload) => {
    proofState.agentVersion = `${payload.agent.name} ${payload.agent.version}`;
    proofState.model = payload.models.current ?? null;
    renderProof();
  })
  .catch(() => {
    proofState.agentVersion = null;
    proofState.model = null;
    renderProof();
  });
