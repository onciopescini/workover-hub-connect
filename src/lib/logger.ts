
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

export interface LogContext {
  component?: string;
  userId?: string;
  action?: string;
  duration?: number;
  contextInfo?: Record<string, string | number | boolean>;
  errorMessage?: string;
  metadata?: Record<string, string | number | boolean>;
  timestamp?: string;
  sessionId?: string;
  performanceLabel?: string;
  startTime?: number;
  endTime?: number;
  progress?: number;
  errorReport?: Record<string, unknown>;
  errorId?: string | null;
  componentStack?: string;
  retryCount?: number;
  level?: string;
  manualReport?: boolean;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  bufferSize: number;
  flushInterval: number;
  enableContextTracking: boolean;
  enablePerformanceTracking: boolean;
}

class Logger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      bufferSize: 50,
      flushInterval: 30000, // 30 seconds
      enableContextTracking: true,
      enablePerformanceTracking: true,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.setupFlushTimer();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupFlushTimer(): void {
    if (this.config.enableRemote && this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level].padEnd(8);
    const context = entry.context ? `[${entry.context}]` : '';
    const userId = entry.userId ? `{user:${entry.userId}}` : '';
    
    return `${timestamp} ${level} ${context}${userId} ${entry.message}`;
  }

  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    if (this.config.enableRemote) {
      try {
        // In a real implementation, this would send to your logging service
        // For now, we'll use a placeholder that could integrate with Supabase
        await this.sendToRemote(entries);
      } catch (error) {
        console.error('Failed to send logs to remote service:', error);
        // Re-add entries to buffer for retry
        this.buffer.unshift(...entries);
      }
    }
  }

  private async sendToRemote(entries: LogEntry[]): Promise<void> {
    // Placeholder for remote logging integration
    // This could integrate with Supabase Edge Functions or external services
    console.log('Would send to remote:', entries.length, 'entries');
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date(),
      level,
      message,
      context: context?.component,
      metadata: {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      },
      error,
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
    };
  }

  private getCurrentUserId(): string | undefined {
    // This would integrate with your auth system
    // For now, return undefined
    return undefined;
  }

  public debug(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, error);
    
    if (this.config.enableConsole) {
      console.debug(this.formatMessage(entry), entry.metadata);
    }
    
    this.addToBuffer(entry);
  }

  public info(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.createLogEntry(LogLevel.INFO, message, context, error);
    
    if (this.config.enableConsole) {
      console.info(this.formatMessage(entry), entry.metadata);
    }
    
    this.addToBuffer(entry);
  }

  public warn(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.createLogEntry(LogLevel.WARN, message, context, error);
    
    if (this.config.enableConsole) {
      console.warn(this.formatMessage(entry), entry.metadata);
    }
    
    this.addToBuffer(entry);
  }

  public error(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    
    if (this.config.enableConsole) {
      console.error(this.formatMessage(entry), entry.metadata, error);
    }
    
    this.addToBuffer(entry);
  }

  public critical(message: string, context?: LogContext, error?: Error): void {
    const entry = this.createLogEntry(LogLevel.CRITICAL, message, context, error);
    
    if (this.config.enableConsole) {
      console.error(`🚨 CRITICAL: ${this.formatMessage(entry)}`, entry.metadata, error);
    }
    
    // Critical logs are immediately flushed
    this.addToBuffer(entry);
    this.flush();
  }

  public startPerformanceTimer(label: string, context?: string): () => void {
    if (!this.config.enablePerformanceTracking) {
      return () => {};
    }

    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.info(`Performance: ${label} completed`, {
        component: context,
        performanceLabel: label,
        duration: duration,
        startTime,
        endTime
      });
    };
  }

  public setUserId(userId: string | undefined): void {
    // This would be called when user logs in/out
    // Store in a way that getCurrentUserId can access it
  }

  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.setupFlushTimer();
  }

  public getBufferSize(): number {
    return this.buffer.length;
  }

  public forceFlush(): Promise<void> {
    return this.flush();
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Create default logger instance
const defaultConfig: Partial<LoggerConfig> = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  bufferSize: 50,
  flushInterval: 30000,
  enableContextTracking: true,
  enablePerformanceTracking: process.env.NODE_ENV !== 'production'
};

export const logger = new Logger(defaultConfig);

// Convenience exports
export const createLogger = (config: Partial<LoggerConfig>) => new Logger(config);

// Helper function to create contextual loggers
export const createContextualLogger = (context: string, baseLogger: Logger = logger) => {
  return {
    debug: (message: string, metadata?: Record<string, any>) => 
      baseLogger.debug(message, { component: context, ...metadata }),
    info: (message: string, metadata?: Record<string, any>) => 
      baseLogger.info(message, { component: context, ...metadata }),
    warn: (message: string, metadata?: Record<string, any>) => 
      baseLogger.warn(message, { component: context, ...metadata }),
    error: (message: string, metadata?: Record<string, any>, error?: Error) => 
      baseLogger.error(message, { component: context, ...metadata }, error),
    critical: (message: string, metadata?: Record<string, any>, error?: Error) => 
      baseLogger.critical(message, { component: context, ...metadata }, error),
    startTimer: (label: string) => baseLogger.startPerformanceTimer(label, context)
  };
};

export default logger;
