
import React from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import posthog from 'posthog-js'
import App from './App.tsx'
import './index.css'

// Note: Sentry is initialized in src/lib/sentry-config.ts via App.tsx
// to prevent double initialization issues

// Initialize PostHog analytics (GDPR compliant)
const posthogKey = import.meta.env['VITE_POSTHOG_KEY'];
if (import.meta.env.PROD && posthogKey) {
  posthog.init(posthogKey, {
    api_host: 'https://app.posthog.com',
    autocapture: false, // Disable auto-capture for GDPR compliance
    capture_pageview: false, // Manual pageview tracking
    disable_session_recording: true, // Disable by default
    opt_out_capturing_by_default: true, // GDPR compliant - opt-in required
  })
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ErrorBoundary showDetails={import.meta.env.DEV}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
