/**
 * Specialized Async Fetch Hook
 * 
 * Extracted from useAsyncState.ts for data fetching with caching support.
 * Optimized for React Query integration and data retrieval operations.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useLogger } from '@/hooks/useLogger';

export interface UseAsyncFetchOptions<T> {
  initialData?: T;
  refetchOnMount?: boolean;
  cacheTime?: number;
  staleTime?: number;
  retryOnError?: boolean;
  maxRetries?: number;
}

export interface UseAsyncFetchReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
  isFetched: boolean;
  fetch: (fetchFn: () => Promise<T>) => Promise<T | null>;
  refetch: () => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

export function useAsyncFetch<T = any>(
  options: UseAsyncFetchOptions<T> = {}
): UseAsyncFetchReturn<T> {
  const {
    initialData = null,
    refetchOnMount = false,
    retryOnError = false,
    maxRetries = 3
  } = options;

  const [data, setData] = useState<T | null>(initialData as T | null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFetched, setIsFetched] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const lastFetchFnRef = useRef<(() => Promise<T>) | null>(null);
  const isMountedRef = useRef(true);

  const { handleAsyncError } = useErrorHandler('AsyncFetch');
  const { info, warn } = useLogger({ context: 'useAsyncFetch' });

  const isError = error !== null;

  const reset = useCallback(() => {
    setData(initialData as T | null);
    setError(null);
    setIsFetched(false);
    setRetryCount(0);
    lastFetchFnRef.current = null;
  }, [initialData]);

  const fetch = useCallback(async (fetchFn: () => Promise<T>): Promise<T | null> => {
    if (!isMountedRef.current) return null;

    lastFetchFnRef.current = fetchFn;
    setIsLoading(true);
    setError(null);

    const result = await handleAsyncError(async () => {
      info('Fetching data');
      const fetchedData = await fetchFn();
      
      if (isMountedRef.current) {
        setData(fetchedData);
        setIsFetched(true);
        setRetryCount(0);
        info('Data fetched successfully');
      }
      
      return fetchedData;
    }, {
      context: 'data_fetch',
      showToast: false // Let the calling component handle user feedback
    });

    if (!result && retryOnError && retryCount < maxRetries) {
      warn(`Fetch failed, retrying... (${retryCount + 1}/${maxRetries})`);
      setRetryCount(prev => prev + 1);
      
      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      setTimeout(() => {
        if (isMountedRef.current && lastFetchFnRef.current) {
          fetch(lastFetchFnRef.current);
        }
      }, delay);
    }

    setIsLoading(false);
    return result;
  }, [handleAsyncError, info, warn, retryOnError, retryCount, maxRetries]);

  const refetch = useCallback(async (): Promise<T | null> => {
    if (!lastFetchFnRef.current) {
      warn('No fetch function to refetch');
      return null;
    }
    return fetch(lastFetchFnRef.current);
  }, [fetch, warn]);

  const setDataManual = useCallback((newData: T | null) => {
    setData(newData);
  }, []);

  // Auto-fetch on mount if requested
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    isError,
    isFetched,
    fetch,
    refetch,
    reset,
    setData: setDataManual
  };
}