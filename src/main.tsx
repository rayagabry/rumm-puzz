import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Reload when a new service worker takes control so the fresh bundle
// (with any newly generated puzzles) is picked up immediately.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
