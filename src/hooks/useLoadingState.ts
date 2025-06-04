
import { useState, useCallback } from 'react';
import { createContextualLogger } from '@/lib/logger';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  progress?: number;
}

export interface UseLoadingStateOptions {
  context?: string;
  enableLogging?: boolean;
  timeout?: number;
}

export interface UseLoadingStateReturn extends LoadingState {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: number) => void;
  withLoading: <T>(operation: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

export function useLoadingState(
  initialState: Partial<LoadingState> = {},
  options: UseLoadingStateOptions = {}
): UseLoadingStateReturn {
  const { context = 'LoadingState', enableLogging = true, timeout = 30000 } = options;
  const logger = enableLogging ? createContextualLogger(context) : null;

  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    progress: undefined,
    ...initialState
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
    if (logger) {
      logger.debug(loading ? 'Loading started' : 'Loading ended', {
        action: loading ? 'loading_start' : 'loading_end',
        contextInfo: context
      });
    }
  }, [logger, context]);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
    if (logger && error) {
      logger.error('Loading error occurred', {
        action: 'loading_error',
        errorMessage: error,
        contextInfo: context
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }, [logger, context]);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress: Math.max(0, Math.min(100, progress)) }));
    if (logger) {
      logger.debug('Loading progress updated', {
        action: 'loading_progress',
        progress,
        contextInfo: context
      });
    }
  }, [logger, context]);

  const withLoading = useCallback(async <T>(operation: () => Promise<T>): Promise<T | null> => {
    const startTime = Date.now();
    setLoading(true);
    setState(prev => ({ ...prev, error: null, progress: undefined }));

    // Setup timeout
    const timeoutId = setTimeout(() => {
      setError(`Operation timed out after ${timeout}ms`);
    }, timeout);

    try {
      const result = await operation();
      clearTimeout(timeoutId);
      
      const duration = Date.now() - startTime;
      if (logger) {
        logger.info('Operation completed successfully', {
          action: 'operation_success',
          duration,
          contextInfo: context
        });
      }
      
      setLoading(false);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (logger) {
        logger.error('Operation failed', {
          action: 'operation_failure',
          duration,
          contextInfo: context,
          errorMessage
        }, error instanceof Error ? error : new Error(String(errorMessage)));
      }
      
      setError(errorMessage);
      return null;
    }
  }, [setLoading, setError, timeout, logger, context]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      progress: undefined
    });
    if (logger) {
      logger.debug('Loading state reset', {
        action: 'state_reset',
        contextInfo: context
      });
    }
  }, [logger, context]);

  return {
    ...state,
    setLoading,
    setError,
    setProgress,
    withLoading,
    reset
  };
}
