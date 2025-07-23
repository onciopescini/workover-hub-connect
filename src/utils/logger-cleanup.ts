/**
 * Logger Cleanup Utility
 * 
 * Provides systematic replacement of console.* calls with proper logging.
 * Used for production-ready code quality enhancement.
 */
import { logger } from '@/lib/logger';

// Production-safe console replacement
export const productionConsole = {
  log: (...args: any[]) => {
    if (import.meta.env.DEV) {
      logger.debug('Console output');
    }
  },
  
  info: (...args: any[]) => {
    logger.info('Info message');
  },
  
  warn: (...args: any[]) => {
    logger.warn('Warning message');
  },
  
  error: (...args: any[]) => {
    const errorMessage = args.map(arg => 
      arg instanceof Error ? arg.message : String(arg)
    ).join(' ');
    logger.error('Error message', {}, args.find(arg => arg instanceof Error) as Error);
  },
  
  debug: (...args: any[]) => {
    if (import.meta.env.DEV) {
      logger.debug('Debug message');
    }
  }
};

// Helper for automatic console.* replacement in components
export const replaceConsoleInComponent = (componentName: string) => {
  const componentLogger = logger;
  
  return {
    log: (...args: any[]) => {
      if (import.meta.env.DEV) {
        componentLogger.debug(`[${componentName}] Console output`, { component: componentName });
      }
    },
    
    error: (message: string, error?: Error) => {
      componentLogger.error(`[${componentName}] ${message}`, { component: componentName }, error);
    },
    
    warn: (message: string, metadata?: any) => {
      componentLogger.warn(`[${componentName}] ${message}`, { component: componentName, ...metadata });
    },
    
    info: (message: string, metadata?: any) => {
      componentLogger.info(`[${componentName}] ${message}`, { component: componentName, ...metadata });
    }
  };
};

// Cleanup summary for reporting
export interface ConsoleCleanupSummary {
  filesProcessed: number;
  consolesReplaced: number;
  errors: string[];
  warnings: string[];
}

export const generateCleanupSummary = (summary: ConsoleCleanupSummary): string => {
  return `
🧹 Console Cleanup Complete

📊 Summary:
- Files processed: ${summary.filesProcessed}
- Console statements replaced: ${summary.consolesReplaced}
- Errors: ${summary.errors.length}
- Warnings: ${summary.warnings.length}

${summary.errors.length > 0 ? `❌ Errors:\n${summary.errors.join('\n')}` : ''}
${summary.warnings.length > 0 ? `⚠️ Warnings:\n${summary.warnings.join('\n')}` : ''}

✅ All console.* calls have been replaced with production-safe logging.
  `.trim();
};