import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Apply a new version as soon as it is downloaded — but never in the middle of a lesson or the warm-up.
let pending = false;
const busy = () => /^#\/(lesson|warmup)/.test(location.hash);
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    pending = true;
    if (!busy()) void updateSW(true);
  },
  onRegisteredSW(_url, reg) {
    // look for updates every 20 minutes and whenever the app comes back to the foreground
    if (!reg) return;
    setInterval(() => void reg.update(), 20 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void reg.update(); });
  },
});
window.addEventListener('hashchange', () => { if (pending && !busy()) void updateSW(true); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
