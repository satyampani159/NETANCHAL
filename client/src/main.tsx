import { createRoot } from 'react-dom/client';
import { initAnalytics } from './analytics';
import { AppShell } from './app/AppShell';
import { initSiteSound } from './game/siteSound';
import './index.css';

initSiteSound();

// passive analytics (reads only; pushes to window.dataLayer for Tag Manager). Never allowed to stop the app.
try {
  initAnalytics();
} catch {
  /* ignore */
}

// No StrictMode: its double-mount would open two rooms and two Phaser games in dev.
createRoot(document.getElementById('root')!).render(<AppShell />);

// PWA: add-to-home-screen + offline solo. Fails quietly where service workers aren't allowed.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {});
}
