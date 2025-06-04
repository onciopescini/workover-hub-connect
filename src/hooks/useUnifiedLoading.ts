
import { useState, useCallback } from 'react';
import { useLoadingState } from './useLoadingState';
import { createContextualLogger } from '@/lib/logger';

interface UnifiedLoadingOptions {
  context?: string;
  enableLogging?: boolean;
  timeout?: number;
  initialMessage?: string;
}

interface LoadingVariant {
  variant: 'spinner' | 'skeleton' | 'overlay';
  message?: string;
  progress?: number;
  skeletonConfig?: {
    rows?: number;
    showAvatar?: boolean;
    showImage?: boolean;
    variant?: 'card' | 'list' | 'profile' | 'text';
  };
}

export function useUnifiedLoading(options: UnifiedLoadingOptions = {}) {
  const {
    context = 'UnifiedLoading',
    enableLogging = true,
    timeout = 30000,
    initialMessage = 'Caricamento...'
  } = options;

  const logger = enableLogging ? createContextualLogger(context) : null;
  
  const loadingState = useLoadingState(
    { isLoading: false, error: null },
    { context, enableLogging, timeout }
  );

  const [currentVariant, setCurrentVariant] = useState<LoadingVariant>({
    variant: 'spinner',
    message: initialMessage
  });

  const startLoading = useCallback((variant: LoadingVariant = { variant: 'spinner' }) => {
    setCurrentVariant(variant);
    loadingState.setLoading(true);
    
    if (logger) {
      logger.debug('Unified loading started', {
        action: 'unified_loading_start',
        variant: variant.variant,
        message: variant.message
      });
    }
  }, [loadingState, logger]);

  const stopLoading = useCallback(() => {
    loadingState.setLoading(false);
    
    if (logger) {
      logger.debug('Unified loading stopped', {
        action: 'unified_loading_stop'
      });
    }
  }, [loadingState, logger]);

  const updateProgress = useCallback((progress: number, message?: string) => {
    loadingState.setProgress(progress);
    if (message) {
      setCurrentVariant(prev => ({ ...prev, message }));
    }
    
    if (logger) {
      logger.debug('Loading progress updated', {
        action: 'progress_update',
        progress,
        message
      });
    }
  }, [loadingState, logger]);

  const withUnifiedLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    variant: LoadingVariant = { variant: 'spinner' }
  ): Promise<T | null> => {
    startLoading(variant);
    
    try {
      const result = await loadingState.withLoading(operation);
      return result;
    } finally {
      // withLoading already handles stopping loading state
    }
  }, [startLoading, loadingState]);

  return {
    // State
    isLoading: loadingState.isLoading,
    error: loadingState.error,
    progress: loadingState.progress,
    currentVariant,
    
    // Actions
    startLoading,
    stopLoading,
    updateProgress,
    withUnifiedLoading,
    setError: loadingState.setError,
    reset: loadingState.reset,
    
    // Loading component props
    getLoadingProps: () => ({
      isLoading: loadingState.isLoading,
      variant: currentVariant.variant,
      message: currentVariant.message,
      progress: loadingState.progress,
      context,
      skeletonConfig: currentVariant.skeletonConfig
    })
  };
}
