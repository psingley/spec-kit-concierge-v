import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Renderer root element was not found.');
}

createRoot(rootElement).render(null);
