/**
 * SRE Logger for Edge Functions
 * 
 * Provides structured, queryable logging with correlation IDs for 
 * distributed tracing across edge functions.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  function?: string;
  data?: Record<string, unknown>;
}

class SRELoggerClass {
  private correlationId: string | null = null;
  private functionName: string | null = null;
  private isProduction: boolean;

  constructor() {
    this.isProduction = Deno.env.get('ENVIRONMENT') === 'production';
  }

  /**
   * Set correlation ID for request tracing
   */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Set function name for context
   */
  setFunctionName(name: string): void {
    this.functionName = name;
  }

  /**
   * Reset context (call at end of request)
   */
  reset(): void {
    this.correlationId = null;
    this.functionName = null;
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(this.correlationId && { correlationId: this.correlationId }),
      ...(this.functionName && { function: this.functionName }),
      ...(data && { data })
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        // Only log debug in non-production
        if (!this.isProduction) {
          console.log(output);
        }
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Debug level logging (dev only)
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  /**
   * Info level logging
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  /**
   * Error level logging
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }

  /**
   * Log with timing for performance tracking
   */
  timed<T>(label: string, fn: () => T | Promise<T>): T | Promise<T> {
    const start = performance.now();
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        this.info(`${label} completed`, { durationMs: Math.round(duration) });
      });
    }
    
    const duration = performance.now() - start;
    this.info(`${label} completed`, { durationMs: Math.round(duration) });
    return result;
  }

  /**
   * Create a timer for manual timing
   */
  startTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.info(`${label} completed`, { durationMs: Math.round(duration) });
    };
  }
}

// Singleton instance
export const SRELogger = new SRELoggerClass();
