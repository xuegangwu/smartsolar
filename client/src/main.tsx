import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

// ─── Sentry 错误监控初始化 ──────────────────────────────────────────────────
// 环境变量: VITE_SENTRY_DSN (前端) / SENTRY_DSN (后端)
// 申请地址: https://sentry.io (免费额度足够)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false }),
    ],
    // 性能采样: 生产环境 10% 就够
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Replay 采样: 只在关键页面开启
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });
}

const root = document.getElementById('root')!;
ReactDOM.createRoot(root).render(<App />);
