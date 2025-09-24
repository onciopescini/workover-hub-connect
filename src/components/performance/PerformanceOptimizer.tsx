import { memo, useMemo, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Performance optimization wrapper component
 * Prevents unnecessary re-renders and optimizes child components
 */
interface PerformanceOptimizerProps {
  children: React.ReactNode;
  dependencies?: React.DependencyList;
  debounceMs?: number;
}

export const PerformanceOptimizer = memo<PerformanceOptimizerProps>(({ 
  children, 
  dependencies = [],
  debounceMs = 100
}) => {
  // Memoize children to prevent unnecessary re-renders
  const memoizedChildren = useMemo(() => {
    return children;
  }, dependencies);

  return <>{memoizedChildren}</>;
});

PerformanceOptimizer.displayName = 'PerformanceOptimizer';

/**
 * HOC to wrap components with performance optimization
 */
export const withPerformanceOptimization = <T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  dependencies?: (props: T) => React.DependencyList
) => {
  const WrappedComponent = memo((props: T) => {
    const deps = dependencies ? dependencies(props) : [props];
    
    const memoizedComponent = useMemo(() => {
      return <Component {...props} />;
    }, deps);

    return memoizedComponent;
  });

  WrappedComponent.displayName = `withPerformanceOptimization(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Hook to optimize expensive operations
 */
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  debounceMs: number = 100
): T => {
  const memoizedCallback = useCallback(callback, deps);
  
  // Apply debouncing for expensive operations
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const timeoutId = setTimeout(() => {
        memoizedCallback(...args);
      }, debounceMs);
      
      return () => clearTimeout(timeoutId);
    },
    [memoizedCallback, debounceMs]
  ) as T;

  return debouncedCallback;
};