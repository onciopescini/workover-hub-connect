import { sreLogger } from '@/lib/sre-logger';
import * as Sentry from '@sentry/react';

/**
 * Error Recovery Strategies
 */

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry automatico per operazioni asincrone
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    exponentialBackoff = true,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      sreLogger.warn('Retry attempt failed', {
        attempt,
        maxAttempts,
        error: lastError.message,
      });

      onRetry?.(attempt, lastError);

      // Se è l'ultimo tentativo, lancia l'errore
      if (attempt === maxAttempts) {
        break;
      }

      // Calcola delay con exponential backoff
      const delay = exponentialBackoff
        ? delayMs * Math.pow(2, attempt - 1)
        : delayMs;

      // Aspetta prima del prossimo tentativo
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Report to Sentry dopo tutti i tentativi falliti
  Sentry.captureException(lastError, {
    tags: {
      retryFailed: true,
      maxAttempts: maxAttempts.toString(),
    },
  });

  throw lastError;
}

/**
 * Fallback per errori in operazioni sincrone
 */
export function withFallback<T>(
  fn: () => T,
  fallbackValue: T,
  context?: string
): T {
  try {
    return fn();
  } catch (error) {
    sreLogger.warn('Operation failed, using fallback', {
      context,
      error: (error as Error).message,
    });
    return fallbackValue;
  }
}

/**
 * Cache resiliente con fallback
 */
export class ResilientCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private ttl: number;

  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttl = ttlMs;
  }

  async get(
    key: string,
    fetcher: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.value;
    }

    try {
      // Fetch con retry
      const value = await retryAsync(fetcher, options);

      // Update cache
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
      });

      return value;
    } catch (error) {
      // Se fetch fallisce ma abbiamo un valore in cache (anche scaduto), usalo
      if (cached) {
        sreLogger.warn('Fetch failed, using stale cache', {
          key,
          age: Date.now() - cached.timestamp,
        });
        return cached.value;
      }

      throw error;
    }
  }

  invalidate(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Circuit Breaker per prevenire chiamate ripetute a servizi falliti
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
    private resetTimeout = 30000 // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Se il circuito è aperto
    if (this.state === 'open') {
      const now = Date.now();
      const timeSinceLastFailure = now - this.lastFailureTime;

      // Prova a chiudere il circuito dopo il reset timeout
      if (timeSinceLastFailure > this.resetTimeout) {
        this.state = 'half-open';
        sreLogger.info('Circuit breaker entering half-open state');
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();

      // Successo: reset failures
      if (this.state === 'half-open') {
        this.state = 'closed';
        sreLogger.info('Circuit breaker closed after successful attempt');
      }
      this.failures = 0;

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      // Apri il circuito se raggiungiamo la soglia
      if (this.failures >= this.threshold) {
        this.state = 'open';
        sreLogger.error('Circuit breaker opened', {
          failures: this.failures,
          threshold: this.threshold,
        });
      }

      throw error;
    }
  }

  reset() {
    this.failures = 0;
    this.state = 'closed';
    sreLogger.info('Circuit breaker manually reset');
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * Graceful degradation per feature flags
 */
export class FeatureToggle {
  private features = new Map<string, boolean>();

  constructor(initialFeatures: Record<string, boolean> = {}) {
    Object.entries(initialFeatures).forEach(([key, value]) => {
      this.features.set(key, value);
    });
  }

  isEnabled(feature: string, fallback = false): boolean {
    return this.features.get(feature) ?? fallback;
  }

  enable(feature: string) {
    this.features.set(feature, true);
    sreLogger.info('Feature enabled', { feature });
  }

  disable(feature: string) {
    this.features.set(feature, false);
    sreLogger.warn('Feature disabled', { feature });
  }

  /**
   * Esegui codice solo se la feature è abilitata
   */
  withFeature<T>(
    feature: string,
    fn: () => T,
    fallback: () => T
  ): T {
    if (this.isEnabled(feature)) {
      try {
        return fn();
      } catch (error) {
        sreLogger.error('Feature execution failed', {
          feature,
          error: (error as Error).message,
        });
        this.disable(feature); // Auto-disable su errore
        return fallback();
      }
    }
    return fallback();
  }
}

/**
 * Error classification per priorità
 */
export function classifyError(error: Error): {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  recoverable: boolean;
} {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';

  // Critical errors
  if (
    message.includes('out of memory') ||
    message.includes('maximum call stack')
  ) {
    return { severity: 'critical', category: 'memory', recoverable: false };
  }

  // High severity
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout')
  ) {
    return { severity: 'high', category: 'network', recoverable: true };
  }

  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return { severity: 'high', category: 'auth', recoverable: false };
  }

  // Medium severity
  if (message.includes('not found') || message.includes('404')) {
    return { severity: 'medium', category: 'notFound', recoverable: true };
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return { severity: 'medium', category: 'validation', recoverable: true };
  }

  // Low severity - UI errors
  if (stack.includes('react') || stack.includes('component')) {
    return { severity: 'low', category: 'ui', recoverable: true };
  }

  // Default
  return { severity: 'medium', category: 'unknown', recoverable: false };
}

/**
 * Auto-recovery basato su classificazione errore
 */
export async function attemptRecovery(error: Error): Promise<boolean> {
  const classification = classifyError(error);

  sreLogger.info('Attempting error recovery', {
    severity: classification.severity,
    category: classification.category,
    recoverable: classification.recoverable,
  });

  if (!classification.recoverable) {
    return false;
  }

  switch (classification.category) {
    case 'network':
      // Retry dopo un delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return true;

    case 'notFound':
      // Redirect alla home
      window.location.href = '/';
      return true;

    case 'validation':
      // Clear form state
      sessionStorage.clear();
      return true;

    default:
      return false;
  }
}
