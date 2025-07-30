import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

// PWA Service Worker Registration
// @ts-expect-error - Virtual module from vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';
import { initializeDB } from '@/lib/indexeddb';
import { init as initNostrLogin } from 'nostr-login';

// TODO: a custom font should be used. Eg:
// import '@fontsource-variable/<font-name>';

// Initialize nostr-login before any window.nostr calls
initNostrLogin({
  theme: 'default',
  startScreen: 'welcome',
  bunkers: 'nsec.app',
  perms: 'sign_event:0,sign_event:1,sign_event:3,sign_event:10002,sign_event:10050,sign_event:31922,sign_event:31923,sign_event:31924,sign_event:31925,sign_event:31926,sign_event:31927,sign_event:1111,sign_event:9735,sign_event:11,sign_event:22,sign_event:25,sign_event:22242,nip44_encrypt,nip44_decrypt',
  noBanner: true,
});

// Initialize IndexedDB and migrate from localStorage
initializeDB().catch(console.error);

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      // Show update available notification
      if (confirm('New content available, reload?')) {
        window.location.reload();
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
    onRegistered(registration) {
      console.log('Service Worker registered:', registration);
    },
    onRegisterError(error) {
      console.error('Service Worker registration failed:', error);
    },
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
