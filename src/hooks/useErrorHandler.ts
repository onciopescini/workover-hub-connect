/**
 * Unified Error Handler Hook
 * 
 * Provides standardized error handling across the application with integrated
 * logging, user notifications, and error tracking.
 * 
 * @example
 * ```tsx
 * const { handleError, handleAsyncError } = useErrorHandler();
 * 
 * // For synchronous errors
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   handleError(error, { context: 'user_action' });
 * }
 * 
 * // For async operations
 * const fetchData = handleAsyncError(async () => {
 *   return await api.getData();
 * }, { context: 'data_fetch' });
 * ```
 */
import { useCallback } from 'react';
import { toast } from 'sonner';
import { reportError } from '@/lib/monitoring';
import { useLogger } from '@/hooks/useLogger';

interface ErrorContext {
  context?: string;
  userId?: string;
  action?: string;
  showToast?: boolean;
  toastMessage?: string;
  retryCount?: number;
  suppressLogging?: boolean;
}

interface UseErrorHandlerReturn {
  /**
   * Handle synchronous errors with unified logging and user feedback
   */
  handleError: (error: Error | string, context?: ErrorContext) => void;
  
  /**
   * Wrap async functions with error handling
   */
  handleAsyncError: <T>(
    fn: () => Promise<T>,
    context?: ErrorContext
  ) => Promise<T | null>;
  
  /**
   * Handle API errors with specific context
   */
  handleApiError: (error: Error | string, endpoint: string, method?: string) => void;
  
  /**
   * Handle form validation errors
   */
  handleFormError: (error: Error | string, formName: string) => void;
  
  /**
   * Create error boundary fallback
   */
  createErrorFallback: (componentName: string) => (error: Error, errorInfo: any) => void;
}

export const useErrorHandler = (defaultContext?: string): UseErrorHandlerReturn => {
  const { error: logError, warn: logWarn } = useLogger({
    context: defaultContext || 'ErrorHandler'
  });

  /**
   * Core error handling logic with Sentry integration and user feedback
   */
  const handleError = useCallback((
    error: Error | string,
    context: ErrorContext = {}
  ) => {
    const {
      context: errorContext = 'unknown',
      showToast = true,
      toastMessage,
      suppressLogging = false,
      retryCount = 0
    } = context;

    const errorInstance = error instanceof Error ? error : new Error(String(error));
    const errorMessage = errorInstance.message || 'An unexpected error occurred';

    // Log error unless suppressed
    if (!suppressLogging) {
      logError(`Error in ${errorContext}: ${errorMessage}`, errorInstance, {
        context: errorContext,
        retryCount,
        stackTrace: errorInstance.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }

    // Report to Sentry with enhanced context
    reportError(errorInstance, {
      ...(context.userId && { userId: context.userId }),
      page: window.location.pathname,
      ...(defaultContext && { feature: defaultContext }),
      context: {
        component: errorContext,
        action: context.action,
        retryCount,
        timestamp: new Date().toISOString()
      }
    });

    // Show user notification
    if (showToast) {
      const displayMessage = toastMessage || getErrorMessage(errorMessage);
      toast.error(displayMessage);
    }
  }, [logError, defaultContext]);

  /**
   * Wrapper for async operations with automatic error handling
   */
  const handleAsyncError = useCallback(async <T>(
    fn: () => Promise<T>,
    context: ErrorContext = {}
  ): Promise<T | null> => {
    try {
      return await fn();
    } catch (error) {
      handleError(error as Error, {
        ...context,
        action: context.action || 'async_operation'
      });
      return null;
    }
  }, [handleError]);

  /**
   * Specialized handler for API errors
   */
  const handleApiError = useCallback((
    error: Error | string,
    endpoint: string,
    method: string = 'GET'
  ) => {
    handleError(error, {
      context: 'api_error',
      action: `${method} ${endpoint}`,
      toastMessage: 'Si è verificato un errore durante la comunicazione con il server'
    });
  }, [handleError]);

  /**
   * Specialized handler for form errors
   */
  const handleFormError = useCallback((
    error: Error | string,
    formName: string
  ) => {
    handleError(error, {
      context: 'form_error',
      action: `form_submit_${formName}`,
      toastMessage: 'Errore durante l\'invio del modulo. Riprova.'
    });
  }, [handleError]);

  /**
   * Create error boundary fallback function
   */
  const createErrorFallback = useCallback((componentName: string) => {
    return (error: Error, errorInfo: any) => {
      handleError(error, {
        context: 'component_error',
        action: `component_render_${componentName}`,
        showToast: false, // Error boundaries should handle their own UI
        suppressLogging: false
      });

      // Additional error boundary specific logging
      logError(`Component Error Boundary: ${componentName}`, error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: componentName
      });
    };
  }, [handleError, logError]);

  return {
    handleError,
    handleAsyncError,
    handleApiError,
    handleFormError,
    createErrorFallback
  };
};

/**
 * Get user-friendly error message based on error content
 */
function getErrorMessage(errorMessage: string): string {
  // Convert technical errors to user-friendly messages
  if (errorMessage.includes('Network Error') || errorMessage.includes('fetch')) {
    return 'Errore di connessione. Verifica la tua connessione internet.';
  }
  
  if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
    return 'Sessione scaduta. Effettua nuovamente il login.';
  }
  
  if (errorMessage.includes('Forbidden') || errorMessage.includes('403')) {
    return 'Non hai i permessi necessari per questa operazione.';
  }
  
  if (errorMessage.includes('Not Found') || errorMessage.includes('404')) {
    return 'Risorsa non trovata. Ricarica la pagina.';
  }
  
  if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
    return 'Errore del server. Riprova più tardi.';
  }
  
  // Default user-friendly message
  return 'Si è verificato un errore imprevisto. Riprova.';
}

export default useErrorHandler;