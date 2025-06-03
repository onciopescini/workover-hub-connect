
import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export interface UseAsyncStateOptions<T> {
  // Initial state
  initialData?: T;
  initialLoading?: boolean;
  
  // Success/Error handling
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  
  // Debounce and timing
  debounceMs?: number;
  retryDelay?: number;
  maxRetries?: number;
  
  // Behavior flags
  showToasts?: boolean;
  resetOnExecute?: boolean;
  cancelOnUnmount?: boolean;
  
  // Future React Query compatibility
  staleTime?: number;
  cacheTime?: number;
  refetchOnFocus?: boolean;
}

export interface UseAsyncState<T> {
  // State
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
  isSuccess: boolean;
  lastExecutedAt: Date | null;
  retryCount: number;
  
  // Actions
  execute: <R = T>(operation: () => Promise<R>) => Promise<R | null>;
  refresh: () => Promise<T | null>;
  reset: () => void;
  cancel: () => void;
  retry: () => Promise<T | null>;
  
  // Utilities
  setData: (data: T | null) => void;
  setError: (error: Error | null) => void;
  setLoading: (loading: boolean) => void;
}

export function useAsyncState<T = any>(
  options: UseAsyncStateOptions<T> = {}
): UseAsyncState<T> {
  const {
    initialData = null,
    initialLoading = false,
    successMessage,
    errorMessage,
    onSuccess,
    onError,
    debounceMs = 0,
    retryDelay = 1000,
    maxRetries = 3,
    showToasts = true,
    resetOnExecute = false,
    cancelOnUnmount = true,
    // Future React Query compatibility (not implemented yet)
    staleTime,
    cacheTime,
    refetchOnFocus
  } = options;

  // Core state
  const [data, setData] = useState<T | null>(initialData as T | null);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [error, setError] = useState<Error | null>(null);
  const [lastExecutedAt, setLastExecutedAt] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Refs for cleanup and operation tracking
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);
  const isMountedRef = useRef(true);

  // Derived state
  const isError = error !== null;
  const isSuccess = !isLoading && !isError && data !== null;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);

  // Reset function
  const reset = useCallback(() => {
    cleanup();
    setData(initialData as T | null);
    setIsLoading(false);
    setError(null);
    setLastExecutedAt(null);
    setRetryCount(0);
    lastOperationRef.current = null;
  }, [initialData, cleanup]);

  // Cancel function
  const cancel = useCallback(() => {
    cleanup();
    setIsLoading(false);
  }, [cleanup]);

  // Internal execute function without debounce
  const executeInternal = useCallback(async <R = T>(
    operation: () => Promise<R>
  ): Promise<R | null> => {
    if (!isMountedRef.current) return null;

    // Cancel any previous operation
    cleanup();

    // Reset state if requested
    if (resetOnExecute) {
      setData(null);
      setError(null);
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    setLastExecutedAt(new Date());

    try {
      const result = await operation();
      
      if (!isMountedRef.current || abortControllerRef.current?.signal.aborted) {
        return null;
      }

      // Update state with result
      setData(result as T);
      setRetryCount(0);

      // Success callbacks
      if (onSuccess) {
        onSuccess(result as T);
      }

      if (showToasts && successMessage) {
        toast.success(successMessage);
      }

      return result;
    } catch (error) {
      if (!isMountedRef.current || abortControllerRef.current?.signal.aborted) {
        return null;
      }

      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      setError(errorObj);

      // Error callbacks
      if (onError) {
        onError(errorObj);
      }

      if (showToasts) {
        const message = errorMessage || errorObj.message || 'Si è verificato un errore';
        toast.error(message);
      }

      console.error('Async operation failed:', errorObj);
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    cleanup,
    resetOnExecute,
    onSuccess,
    onError,
    showToasts,
    successMessage,
    errorMessage
  ]);

  // Main execute function with debounce support
  const execute = useCallback(<R = T>(
    operation: () => Promise<R>
  ): Promise<R | null> => {
    // Store operation for retry functionality
    lastOperationRef.current = operation;

    return new Promise((resolve) => {
      // Clear any existing debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      const executeOperation = async () => {
        const result = await executeInternal(operation);
        resolve(result);
      };

      if (debounceMs > 0) {
        debounceTimeoutRef.current = setTimeout(executeOperation, debounceMs);
      } else {
        executeOperation();
      }
    });
  }, [executeInternal, debounceMs]);

  // Refresh function (re-executes last operation)
  const refresh = useCallback(async (): Promise<T | null> => {
    if (!lastOperationRef.current) {
      console.warn('No operation to refresh');
      return null;
    }
    return execute(lastOperationRef.current);
  }, [execute]);

  // Retry function with exponential backoff
  const retry = useCallback(async (): Promise<T | null> => {
    if (!lastOperationRef.current) {
      console.warn('No operation to retry');
      return null;
    }

    if (retryCount >= maxRetries) {
      if (showToasts) {
        toast.error(`Numero massimo di tentativi raggiunto (${maxRetries})`);
      }
      return null;
    }

    // Increment retry count
    setRetryCount(prev => prev + 1);

    // Calculate delay with exponential backoff
    const delay = retryDelay * Math.pow(2, retryCount);
    
    if (showToasts) {
      toast.info(`Tentativo ${retryCount + 1}/${maxRetries} in corso...`);
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));

    return execute(lastOperationRef.current);
  }, [execute, retryCount, maxRetries, retryDelay, showToasts]);

  // Manual setters for advanced use cases
  const setDataManual = useCallback((newData: T | null) => {
    setData(newData);
  }, []);

  const setErrorManual = useCallback((newError: Error | null) => {
    setError(newError);
  }, []);

  const setLoadingManual = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (cancelOnUnmount) {
        cleanup();
      }
    };
  }, [cleanup, cancelOnUnmount]);

  return {
    // State
    data,
    isLoading,
    error,
    isError,
    isSuccess,
    lastExecutedAt,
    retryCount,
    
    // Actions
    execute,
    refresh,
    reset,
    cancel,
    retry,
    
    // Utilities
    setData: setDataManual,
    setError: setErrorManual,
    setLoading: setLoadingManual
  };
}

// Convenience hook variants for common use cases
export function useAsyncStateWithToasts<T>(
  options: Omit<UseAsyncStateOptions<T>, 'showToasts'> = {}
) {
  return useAsyncState<T>({ ...options, showToasts: true });
}

export function useAsyncStateWithDebounce<T>(
  debounceMs: number,
  options: UseAsyncStateOptions<T> = {}
) {
  return useAsyncState<T>({ ...options, debounceMs });
}

export function useAsyncStateWithRetry<T>(
  maxRetries: number,
  retryDelay?: number,
  options: UseAsyncStateOptions<T> = {}
) {
  return useAsyncState<T>({ ...options, maxRetries, retryDelay });
}
