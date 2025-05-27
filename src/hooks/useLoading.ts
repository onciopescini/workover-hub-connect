
import { useState } from 'react';

export interface UseLoadingReturn {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T>;
}

export function useLoading(initialState = false): UseLoadingReturn {
  const [isLoading, setIsLoading] = useState(initialState);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const withLoading = async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    setLoading,
    withLoading
  };
}
