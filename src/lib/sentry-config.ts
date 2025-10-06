import * as Sentry from '@sentry/react';
import { sreLogger } from '@/lib/sre-logger';

/**
 * Sentry Configuration e Setup
 */

const SENTRY_DSN = import.meta.env['VITE_SENTRY_DSN'];
const ENVIRONMENT = import.meta.env.MODE;
const IS_PRODUCTION = ENVIRONMENT === 'production';

// Prevent double initialization
let sentryInitialized = false;

/**
 * Inizializza Sentry con configurazione ottimizzata
 */
export function initSentry() {
  // Prevent double initialization
  if (sentryInitialized) {
    sreLogger.warn('Sentry already initialized, skipping');
    return;
  }

  // Skip in development se non esplicitamente richiesto
  if (!IS_PRODUCTION && !import.meta.env['VITE_ENABLE_SENTRY_DEV']) {
    sreLogger.info('Sentry disabled in development');
    return;
  }

  if (!SENTRY_DSN) {
    sreLogger.warn('Sentry DSN not configured');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,
      
      // Performance Monitoring
      integrations: [
        Sentry.browserTracingIntegration(),
      ],

      // Performance
      tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
      
      // Session Replay (disabled)
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,

      // Error Filtering
      beforeSend(event, hint) {
        const error = hint.originalException;

        // Filter out specific errors
        if (error instanceof Error) {
          // Ignore ResizeObserver errors
          if (error.message.includes('ResizeObserver')) {
            return null;
          }

          // Ignore extension errors
          if (error.stack?.includes('chrome-extension://')) {
            return null;
          }

          // Ignore script loading errors from ad blockers
          if (error.message.includes('script.js') && error.message.includes('Failed to load')) {
            return null;
          }
        }

        return event;
      },

      // Breadcrumbs
      beforeBreadcrumb(breadcrumb) {
        // Filter sensitive data from breadcrumbs
        if (breadcrumb.category === 'console') {
          return null; // Skip console breadcrumbs
        }

        // Sanitize URLs
        if (breadcrumb.data?.['url']) {
          breadcrumb.data['url'] = sanitizeUrl(breadcrumb.data['url']);
        }

        return breadcrumb;
      },

      // Additional config
      maxBreadcrumbs: 50,
      attachStacktrace: true,
      
      // PII
      sendDefaultPii: false,
    });

    // Set user context (se disponibile)
    const userId = localStorage.getItem('userId');
    if (userId) {
      Sentry.setUser({ id: userId });
    }

    sentryInitialized = true;
    sreLogger.info('Sentry initialized', { environment: ENVIRONMENT });
  } catch (error) {
    sreLogger.error('Failed to initialize Sentry', { error });
  }
}

/**
 * Cattura eccezione custom con contesto
 */
export function captureError(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    level?: Sentry.SeverityLevel;
  }
) {
  const { tags, extra, level = 'error' } = context || {};

  Sentry.captureException(error, {
    level,
    tags: {
      ...(tags || {}),
      captured: 'manual',
    },
    extra: extra || {},
  });

  sreLogger.error('Error captured by Sentry', {
    error: error.message,
    tags,
  });
}

/**
 * Cattura messaggio custom (non un'eccezione)
 */
export function captureMessage(
  message: string,
  context?: {
    level?: Sentry.SeverityLevel;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
) {
  const { level = 'info', tags, extra } = context || {};

  Sentry.captureMessage(message, {
    level,
    tags: tags || {},
    extra: extra || {},
  });
}

/**
 * Set user context
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  Sentry.setUser(user);
  sreLogger.info('Sentry user context set', { userId: user.id });
}

/**
 * Clear user context (logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
  sreLogger.info('Sentry user context cleared');
}

/**
 * Add breadcrumb manualmente
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  category?: string
) {
  Sentry.addBreadcrumb({
    message,
    data: data || {},
    category: category || 'custom',
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set custom context
 */
export function setContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}

/**
 * Sanitize URL to remove sensitive data
 */
function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove sensitive query params
    const sensitiveParams = ['token', 'api_key', 'password', 'secret'];
    sensitiveParams.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Wrapper per async operations con Sentry tracing (using spans)
 */
export async function withSentryTracing<T>(
  operation: string,
  fn: () => Promise<T>,
  options?: {
    tags?: Record<string, string>;
    data?: Record<string, any>;
  }
): Promise<T> {
  return await Sentry.startSpan(
    {
      name: operation,
      op: 'function',
      attributes: {
        ...(options?.tags || {}),
        ...(options?.data || {}),
      },
    },
    async () => {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        captureError(error as Error, {
          tags: { operation, ...(options?.tags || {}) },
          extra: options?.data || {},
        });
        throw error;
      }
    }
  );
}
