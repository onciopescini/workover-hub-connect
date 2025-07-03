/**
 * Production Monitoring Utilities
 * 
 * Centralized utilities for application monitoring, performance tracking,
 * and error reporting in production environments.
 * 
 * @example
 * ```typescript
 * import { reportError, trackPerformance, measureFunction } from '@/lib/monitoring';
 * 
 * // Report custom errors
 * reportError(new Error('Custom error'), { context: 'user_action' });
 * 
 * // Track performance manually
 * trackPerformance('api_call', 150, { endpoint: '/api/spaces' });
 * 
 * // Measure function performance
 * const result = await measureFunction('fetchSpaces', () => fetchSpaces());
 * ```
 */
import * as Sentry from '@sentry/react';

export interface ErrorContext {
  userId?: string;
  userRole?: string;
  page?: string;
  feature?: string;
  context?: Record<string, any>;
}

export interface PerformanceContext {
  endpoint?: string;
  feature?: string;
  userRole?: string;
  metadata?: Record<string, any>;
}

/**
 * Report errors to Sentry with enhanced context
 * 
 * @param error - Error to report
 * @param context - Additional context for debugging
 * @param level - Error severity level
 */
export const reportError = (
  error: Error | string, 
  context?: ErrorContext,
  level: 'error' | 'warning' | 'info' = 'error'
) => {
  try {
    if (context) {
      Sentry.withScope((scope) => {
        // Set user context
        if (context.userId) {
          scope.setUser({
            id: context.userId,
            ...(context.userRole && { role: context.userRole })
          });
        }

        // Set tags for filtering
        if (context.page) scope.setTag('page', context.page);
        if (context.feature) scope.setTag('feature', context.feature);
        if (context.userRole) scope.setTag('user_role', context.userRole);

        // Set additional context
        if (context.context) {
          scope.setContext('custom', context.context);
        }

        scope.setLevel(level);
        
        if (error instanceof Error) {
          Sentry.captureException(error);
        } else {
          Sentry.captureMessage(error, level);
        }
      });
    } else {
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(error, level);
      }
    }
  } catch (sentryError) {
    // Fallback to console if Sentry fails
    console.error('Monitoring error:', sentryError);
    console.error('Original error:', error);
  }
};

/**
 * Track performance metrics
 * 
 * @param operationName - Name of the operation
 * @param duration - Duration in milliseconds
 * @param context - Additional performance context
 */
export const trackPerformance = (
  operationName: string,
  duration: number,
  context?: PerformanceContext
) => {
  try {
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${operationName}: ${duration}ms`,
      data: {
        operation: operationName,
        duration,
        ...context
      },
      level: duration > 1000 ? 'warning' : 'info'
    });

    // Note: Sentry metrics require specific setup - implementing custom tracking

    // Log slow operations
    if (duration > 2000) {
      reportError(
        `Slow operation detected: ${operationName} took ${duration}ms`,
        { 
          context: { 
            operation: operationName, 
            duration, 
            ...context 
          } 
        },
        'warning'
      );
    }
  } catch (error) {
    console.warn('Performance tracking failed:', error);
  }
};

/**
 * Measure function execution time and report performance
 * 
 * @param operationName - Name of the operation for tracking
 * @param fn - Function to measure
 * @param context - Additional context for performance tracking
 * @returns Promise with the function result
 */
export const measureFunction = async <T>(
  operationName: string,
  fn: () => Promise<T> | T,
  context?: PerformanceContext
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    
    trackPerformance(operationName, duration, context);
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    reportError(
      error instanceof Error ? error : new Error(String(error)),
      {
        context: {
          operation: operationName,
          duration,
          ...context
        }
      }
    );
    
    throw error;
  }
};

/**
 * Create a performance span for complex operations
 * 
 * @param name - Span name
 * @param operation - Operation type
 * @returns Sentry span
 */
export const startSpan = (name: string, operation: string = 'custom') => {
  return Sentry.startSpan({ 
    name, 
    op: operation 
  }, () => {
    // Span implementation
  });
};

/**
 * Monitor API calls and automatically track performance
 * 
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Enhanced fetch response with monitoring
 */
export const monitoredFetch = async (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  const operationName = `api_${options?.method || 'GET'}_${url.split('/').pop()}`;
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, options);
    const duration = performance.now() - startTime;
    
    trackPerformance(operationName, duration, {
      endpoint: url,
      metadata: {
        status: response.status,
        method: options?.method || 'GET'
      }
    });
    
    if (!response.ok) {
      reportError(
        `API Error: ${response.status} ${response.statusText}`,
        {
          context: {
            url,
            method: options?.method || 'GET',
            status: response.status,
            duration
          }
        },
        response.status >= 500 ? 'error' : 'warning'
      );
    }
    
    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    reportError(
      error instanceof Error ? error : new Error(String(error)),
      {
        context: {
          url,
          method: options?.method || 'GET',
          duration
        }
      }
    );
    
    throw error;
  }
};

/**
 * Set user context for monitoring
 * 
 * @param userId - User identifier
 * @param userData - Additional user data
 */
export const setUserContext = (userId: string, userData?: Record<string, any>) => {
  Sentry.setUser({
    id: userId,
    ...userData
  });
};

/**
 * Clear user context (e.g., on logout)
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
};

export default {
  reportError,
  trackPerformance,
  measureFunction,
  startSpan,
  monitoredFetch,
  setUserContext,
  clearUserContext
};