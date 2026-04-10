import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handler to prevent white screen of death
window.addEventListener('error', (e) => {
  console.error('[SmartSolar Error]', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[SmartSolar Promise Error]', e.reason);
});

const root = document.getElementById('root')!;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
