
import { useState, useCallback, useRef } from 'react';

interface OptimizedLoadingState {
  isLoading: boolean;
  error: string | null;
  progress: number;
}

interface UseOptimizedLoadingOptions {
  minLoadingTime?: number;
  maxLoadingTime?: number;
  enableDebounce?: boolean;
  debounceTime?: number;
}

export function useOptimizedLoading(options: UseOptimizedLoadingOptions = {}) {
  const {
    minLoadingTime = 0,
    maxLoadingTime = 30000,
    enableDebounce = true,
    debounceTime = 300
  } = options;

  const [state, setState] = useState<OptimizedLoadingState>({
    isLoading: false,
    error: null,
    progress: 0
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const debounceRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  const setLoading = useCallback((loading: boolean, immediate = false) => {
    const updateState = () => {
      if (loading) {
        startTimeRef.current = Date.now();
        setState(prev => ({ ...prev, isLoading: true, error: null, progress: 0 }));
        
        // Auto-timeout per evitare loading infiniti
        if (maxLoadingTime > 0) {
          timeoutRef.current = setTimeout(() => {
            setState(prev => ({ 
              ...prev, 
              isLoading: false, 
              error: 'Timeout: operazione troppo lenta' 
            }));
          }, maxLoadingTime);
        }
      } else {
        // Rispetta minLoadingTime per evitare flicker
        const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
        const delay = Math.max(0, minLoadingTime - elapsed);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        setTimeout(() => {
          setState(prev => ({ ...prev, isLoading: false, progress: 100 }));
        }, delay);
      }
    };

    if (enableDebounce && !immediate) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(updateState, debounceTime);
    } else {
      updateState();
    }
  }, [minLoadingTime, maxLoadingTime, enableDebounce, debounceTime]);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress: Math.min(100, Math.max(0, progress)) }));
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setState({ isLoading: false, error: null, progress: 0 });
  }, []);

  const withLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    progressCallback?: (progress: number) => void
  ): Promise<T | null> => {
    setLoading(true, true);
    
    try {
      const result = await operation();
      if (progressCallback) {
        progressCallback(100);
      }
      setProgress(100);
      return result;
    } catch (error) {
      console.error('Operation failed:', error);
      setError(error instanceof Error ? error.message : 'Operazione fallita');
      return null;
    } finally {
      setLoading(false, true);
    }
  }, [setLoading, setError, setProgress]);

  return {
    ...state,
    setLoading,
    setError,
    setProgress,
    reset,
    withLoading
  };
}
