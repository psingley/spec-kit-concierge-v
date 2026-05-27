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

const renderAppVersionProof = (version: string | null): void => {
  root.render(
    version === null ? null : <span data-testid="app-version-proof">{version}</span>
  );
};

renderAppVersionProof(null);

void proofStore
  .dispatch(api.endpoints.getAppVersion.initiate())
  .unwrap()
  .then((payload) => {
    renderAppVersionProof(payload.version);
  })
  .catch(() => {
    renderAppVersionProof(null);
  });
