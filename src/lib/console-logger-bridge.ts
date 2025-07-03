/**
 * Console to Logger Bridge
 * 
 * Provides a smooth transition from console.* to centralized logging.
 * Use this bridge in components during the migration period.
 */
import { logger } from '@/lib/logger';

interface LogContext {
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

/**
 * Production-safe console replacement that integrates with our logger
 */
export const safeConsole = {
  /**
   * Development-only logging
   */
  log: (message: string, context?: LogContext) => {
    if (process.env['NODE_ENV'] === 'development') {
      logger.debug(message, context);
    }
  },

  /**
   * General information logging
   */
  info: (message: string, context?: LogContext) => {
    logger.info(message, context);
  },

  /**
   * Warning logging
   */
  warn: (message: string, context?: LogContext) => {
    logger.warn(message, context);
  },

  /**
   * Error logging with optional Error object
   */
  error: (message: string, error?: Error, context?: LogContext) => {
    logger.error(message, context, error);
  },

  /**
   * Debug logging (development only)
   */
  debug: (message: string, context?: LogContext) => {
    if (process.env['NODE_ENV'] === 'development') {
      logger.debug(message, context);
    }
  }
};

/**
 * Create a scoped console for a specific component
 */
export const createScopedConsole = (componentName: string) => {
  const baseContext = { component: componentName };

  return {
    log: (message: string, metadata?: Record<string, any>) => 
      safeConsole.log(message, { ...baseContext, ...metadata }),
    
    info: (message: string, metadata?: Record<string, any>) => 
      safeConsole.info(message, { ...baseContext, ...metadata }),
    
    warn: (message: string, metadata?: Record<string, any>) => 
      safeConsole.warn(message, { ...baseContext, ...metadata }),
    
    error: (message: string, error?: Error, metadata?: Record<string, any>) => 
      safeConsole.error(message, error, { ...baseContext, ...metadata }),
    
    debug: (message: string, metadata?: Record<string, any>) => 
      safeConsole.debug(message, { ...baseContext, ...metadata })
  };
};

/**
 * Utility to track console cleanup progress
 */
export const logCleanupProgress = (phase: string, details: Record<string, any>) => {
  logger.info(`Console Cleanup: ${phase}`, {
    component: 'ConsoleCleanup',
    metadata: { phase, ...details }
  });
};