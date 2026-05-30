import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-mono/400.css';
import './styles/index.css';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { api } from './api';
import type { RendererBoundCLICapabilities } from './api/capabilities.factory';
import type { AppVersionProof } from './api';
import { App } from './App';
import { store } from './store';

const rootElement = document.getElementById('root');

if (import.meta.env.DEV) {
  window.__CONCIERGE_VISUAL_STORE__ = store;
}

if (rootElement === null) {
  throw new Error('Renderer root element was not found.');
}

const ProofBadges = (): React.ReactElement => {
  const [version, setVersion] = useState<string | null>(null);
  const [agentVersion, setAgentVersion] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);

  useEffect(() => {
    void store
      .dispatch(api.endpoints.getAppVersion.initiate())
      .unwrap()
      .then((payload: AppVersionProof) => setVersion(payload.version))
      .catch(() => setVersion(null));
    void store
      .dispatch(api.endpoints.getBoundCLICapabilities.initiate())
      .unwrap()
      .then((payload: RendererBoundCLICapabilities) => {
        setAgentVersion(`${payload.agent.name} ${payload.agent.version}`);
        setModel(payload.models.current ?? null);
      })
      .catch(() => {
        setAgentVersion(null);
        setModel(null);
      });
  }, []);

  return (
    <div className="proof-badges" aria-hidden="true">
      {version === null ? null : <span data-testid="app-version-proof">{version}</span>}
      {agentVersion === null ? null : <span data-testid="bound-cli-proof">{`${agentVersion}:${model ?? 'unknown-model'}`}</span>}
    </div>
  );
};

createRoot(rootElement).render(
  <Provider store={store}>
    <App />
    <ProofBadges />
  </Provider>
);
