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

// TODO: a custom font should be used. Eg:
// import '@fontsource-variable/<font-name>';

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
