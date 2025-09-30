/**
 * SRE Logger - Structured logging and metrics collection
 * 
 * Purpose: Provide structured logging with context and metrics tracking
 * for production observability and debugging.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  METRIC = 'METRIC'
}

export interface SRELogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    component?: string;
    action?: string;
    duration?: number;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface MetricEntry {
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'bytes' | 'percentage';
  tags?: Record<string, string>;
  timestamp: string;
}

class SRELogger {
  private buffer: SRELogEntry[] = [];
  private metricsBuffer: MetricEntry[] = [];
  private readonly maxBufferSize = 100;
  private readonly flushInterval = 10000; // 10 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    if (typeof window !== 'undefined') {
      this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
    }
  }

  private log(level: LogLevel, message: string, context?: any, error?: Error) {
    const entry: SRELogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
      metadata: context?.metadata,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        ...(error.stack && { stack: error.stack }),
      };
    }

    this.buffer.push(entry);

    // Console output in structured format
    const logData = JSON.stringify(entry, null, 2);
    
    if (import.meta.env.DEV) {
      switch (level) {
        case LogLevel.ERROR:
          console.error(`[SRE:${level}]`, logData);
          break;
        case LogLevel.WARN:
          console.warn(`[SRE:${level}]`, logData);
          break;
        default:
          console.log(`[SRE:${level}]`, logData);
      }
    }

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  debug(message: string, context?: any) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: any) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: any, error?: Error) {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context?: any, error?: Error) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log a performance metric
   */
  logMetric(name: string, value: number, unit: MetricEntry['unit'], tags?: Record<string, string>) {
    const metric: MetricEntry = {
      name,
      value,
      unit,
      ...(tags && { tags }),
      timestamp: new Date().toISOString(),
    };

    this.metricsBuffer.push(metric);

    if (import.meta.env.DEV) {
      console.log('[SRE:METRIC]', JSON.stringify(metric, null, 2));
    }

    // Log as structured entry too
    this.log(LogLevel.METRIC, `Metric: ${name}`, {
      metric: name,
      value,
      unit,
      tags,
    });
  }

  /**
   * Start a performance timer
   */
  startTimer(label: string, context?: any): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.logMetric(label, duration, 'ms', context);
      
      this.info(`Timer completed: ${label}`, {
        ...context,
        duration,
        label,
      });
    };
  }

  /**
   * Flush buffered logs to storage or remote service
   */
  private async flush() {
    if (this.buffer.length === 0 && this.metricsBuffer.length === 0) {
      return;
    }

    const logs = [...this.buffer];
    const metrics = [...this.metricsBuffer];
    
    this.buffer = [];
    this.metricsBuffer = [];

    try {
      // In production, send to monitoring service
      if (!import.meta.env.DEV) {
        // TODO: Send to your monitoring backend
        // await fetch('/api/logs', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ logs, metrics })
        // });
      }
    } catch (error) {
      console.error('[SRE] Failed to flush logs:', error);
      // Re-add to buffer on failure
      this.buffer.unshift(...logs);
      this.metricsBuffer.unshift(...metrics);
    }
  }

  /**
   * Force flush all buffered logs
   */
  async forceFlush() {
    await this.flush();
  }

  /**
   * Cleanup on destruction
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Singleton instance
export const sreLogger = new SRELogger();

// Convenience exports
export const logDebug = (message: string, context?: any) => sreLogger.debug(message, context);
export const logInfo = (message: string, context?: any) => sreLogger.info(message, context);
export const logWarn = (message: string, context?: any, error?: Error) => sreLogger.warn(message, context, error);
export const logError = (message: string, context?: any, error?: Error) => sreLogger.error(message, context, error);
export const logMetric = (name: string, value: number, unit: MetricEntry['unit'], tags?: Record<string, string>) => 
  sreLogger.logMetric(name, value, unit, tags);
export const startTimer = (label: string, context?: any) => sreLogger.startTimer(label, context);
