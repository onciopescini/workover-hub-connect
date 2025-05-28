
import { useRef, useCallback } from 'react';

export const useRequestManager = () => {
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const canFetch = useCallback((debounceMs: number = 5000) => {
    // Prevenire fetch multipli simultanei
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return false;
    }

    // Debouncing - non fare fetch se l'ultimo è stato fatto di recente
    const now = Date.now();
    if (now - lastFetchRef.current < debounceMs) {
      console.log('Debouncing fetch request...');
      return false;
    }

    return true;
  }, []);

  const startFetch = useCallback(() => {
    // Cancella richieste precedenti se esistono
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    isFetchingRef.current = true;
    lastFetchRef.current = Date.now();

    // Crea nuovo AbortController per questa richiesta
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);

  const endFetch = useCallback(() => {
    isFetchingRef.current = false;
    abortControllerRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const debounce = useCallback((callback: () => void, delay: number) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(callback, delay);
  }, []);

  return {
    canFetch,
    startFetch,
    endFetch,
    cleanup,
    debounce,
    isAborted: (error: any) => error?.name === 'AbortError'
  };
};
