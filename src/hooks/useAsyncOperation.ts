
import { useState } from 'react';
import { toast } from 'sonner';

export interface UseAsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseAsyncOperationReturn {
  isLoading: boolean;
  execute: <T>(operation: () => Promise<T>) => Promise<T | null>;
}

export function useAsyncOperation(options: UseAsyncOperationOptions = {}): UseAsyncOperationReturn {
  const [isLoading, setIsLoading] = useState(false);

  const execute = async <T>(operation: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    try {
      const result = await operation();
      
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      
      if (options.onSuccess) {
        options.onSuccess();
      }
      
      return result;
    } catch (error) {
      console.error('Async operation failed:', error);
      
      const errorMessage = options.errorMessage || 'Si è verificato un errore';
      toast.error(errorMessage);
      
      if (options.onError) {
        options.onError(error as Error);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    execute
  };
}
