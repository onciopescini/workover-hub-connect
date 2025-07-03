
import React from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'
import App from './App.tsx'
import './index.css'

// Initialize Sentry for error tracking
Sentry.init({
  dsn: "https://your-sentry-dsn@sentry.io/project-id", // Replace with actual DSN
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  beforeSend(event) {
    // Filter out non-production errors in development
    if (import.meta.env.DEV && event.exception) {
      return null;
    }
    return event;
  },
})

// Initialize PostHog analytics (GDPR compliant)
if (import.meta.env.PROD) {
  posthog.init('your-posthog-key', { // Replace with actual key
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

// Wrap App with Sentry ErrorBoundary
const SentryApp = Sentry.withErrorBoundary(App, {
  fallback: ({ error, resetError }) => (
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
  ),
  showDialog: false,
});

root.render(
  <React.StrictMode>
    <SentryApp />
  </React.StrictMode>
);
