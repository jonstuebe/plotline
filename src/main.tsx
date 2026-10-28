import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initPwa } from './lib/pwa';
import '@fontsource/libre-baskerville/latin-400.css';
import '@fontsource/libre-baskerville/latin-400-italic.css';
import '@fontsource/libre-baskerville/latin-700.css';
import '@fontsource/special-elite/latin-400.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

initPwa();
