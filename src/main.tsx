import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App.tsx'

// Manual Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let refreshing = false;

    // Listen for new service worker taking control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('Taskflow: [SW] Registered manually with scope:', registration.scope);
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
