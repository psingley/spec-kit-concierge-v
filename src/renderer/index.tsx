import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { api } from './api';
import type { RendererBoundCLICapabilities } from './api/capabilities.factory';
import type { AppVersionProof } from './api';
import { store } from './store';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Renderer root element was not found.');
}

const root = createRoot(rootElement);

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
    React.createElement(Provider, {
      store,
      children: React.createElement(
        React.Fragment,
        null,
        proofState.version === null
          ? null
          : React.createElement('span', { 'data-testid': 'app-version-proof' }, proofState.version),
        proofState.agentVersion === null
          ? null
          : React.createElement(
              'span',
              { 'data-testid': 'bound-cli-proof' },
              `${proofState.agentVersion}:${proofState.model ?? 'unknown-model'}`
            )
      )
    })
  );
};

renderProof();

void store
  .dispatch(api.endpoints.getAppVersion.initiate())
  .unwrap()
  .then((payload: AppVersionProof) => {
    proofState.version = payload.version;
    renderProof();
  })
  .catch(() => {
    proofState.version = null;
    renderProof();
  });

void store
  .dispatch(api.endpoints.getBoundCLICapabilities.initiate())
  .unwrap()
  .then((payload: RendererBoundCLICapabilities) => {
    proofState.agentVersion = `${payload.agent.name} ${payload.agent.version}`;
    proofState.model = payload.models.current ?? null;
    renderProof();
  })
  .catch(() => {
    proofState.agentVersion = null;
    proofState.model = null;
    renderProof();
  });
