
import React from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
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
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto text-center p-6">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              Oops! Qualcosa è andato storto
            </h1>
            <p className="text-muted-foreground mb-4">
              Si è verificato un errore imprevisto. Il nostro team è stato notificato.
            </p>
            <button 
              onClick={resetError}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Ricarica la pagina
            </button>
          </div>
        </div>
      )}
      showDialog={false}
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
