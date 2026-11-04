import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// A new service worker activates as soon as it is downloaded (skipWaiting). Reload to use it —
// but never in the middle of a lesson or the warm-up: then wait until the child leaves it.
let pending = false;
const busy = () => /^#\/(lesson|warmup)/.test(location.hash);
const reloadWhenFree = () => { if (busy()) pending = true; else location.reload(); };
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) reloadWhenFree(); });
}
window.addEventListener('hashchange', () => { if (pending && !busy()) location.reload(); });
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    // look for updates every 20 minutes and whenever the app comes back to the foreground
    if (!reg) return;
    setInterval(() => void reg.update(), 20 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void reg.update(); });
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
