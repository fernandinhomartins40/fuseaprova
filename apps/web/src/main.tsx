import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';

// O service worker é registrado por /registerSW.js (vite-plugin-pwa, injectRegister: 'script'),
// sem script inline, para respeitar a CSP 'self'.
createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
