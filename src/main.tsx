import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App.tsx'

// Manual Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('Taskflow: [SW] Registered manually with scope:', registration.scope);

        // PWA Diagnostic Logging
        console.log('PWA CHECK:');
        console.log('manifest:', (document.querySelector('link[rel="manifest"]') as HTMLLinkElement)?.href);
        console.log('standalone:', window.matchMedia('(display-mode: standalone)').matches);
        console.log('serviceWorker registered:', !!registration);
        console.log('serviceWorker active:', !!registration.active);

        // Check manifest accessibility
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (manifestLink?.href) {
          fetch(manifestLink.href)
            .then(res => res.json())
            .then(manifest => {
              console.log('✅ Manifest loaded:', manifest);
              console.log('Icons:', manifest.icons);
            })
            .catch(err => console.error('❌ Manifest fetch failed:', err));
        }
      })
      .catch(error => {
        console.error('Taskflow: [SW] Registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
