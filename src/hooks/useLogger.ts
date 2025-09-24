
import { useCallback, useRef, useEffect } from 'react';
import { logger, createContextualLogger, LogLevel } from '@/lib/logger';

interface UseLoggerOptions {
  context?: string;
  enablePerformanceTracking?: boolean;
  enableDebugMode?: boolean;
  metadata?: Record<string, any>;
}

interface PerformanceTimer {
  end: () => void;
  label: string;
  startTime: number;
}

interface UseLoggerReturn {
  // Basic logging methods
  debug: (message: string, metadata?: Record<string, any>) => void;
  info: (message: string, metadata?: Record<string, any>) => void;
  warn: (message: string, metadata?: Record<string, any>) => void;
  error: (message: string, error?: Error, metadata?: Record<string, any>) => void;
  critical: (message: string, error?: Error, metadata?: Record<string, any>) => void;
  
  // Performance tracking
  startTimer: (label: string) => PerformanceTimer;
  trackRender: (componentName: string) => void;
  trackMount: (componentName: string) => void;
  trackUnmount: (componentName: string) => void;
  
  // User interaction tracking
  trackClick: (element: string, metadata?: Record<string, any>) => void;
  trackNavigation: (route: string, metadata?: Record<string, any>) => void;
  trackFormSubmit: (formName: string, success: boolean, metadata?: Record<string, any>) => void;
  
  // API call tracking
  trackApiCall: (endpoint: string, method: string, metadata?: Record<string, any>) => {
    success: (responseTime: number, metadata?: Record<string, any>) => void;
    error: (error: Error, responseTime: number, metadata?: Record<string, any>) => void;
  };
  
  // Hook lifecycle
  setContext: (newContext: string) => void;
  addMetadata: (key: string, value: string | number | boolean | null) => void;
  removeMetadata: (key: string) => void;
  
  // Logger instance for advanced usage
  logger: typeof logger;
}

export const useLogger = (options: UseLoggerOptions = {}): UseLoggerReturn => {
  const {
    context = 'Component',
    enablePerformanceTracking = true,
    enableDebugMode = import.meta.env.DEV,
    metadata: initialMetadata = {}
  } = options;

  const contextRef = useRef(context);
  const metadataRef = useRef<Record<string, any>>(initialMetadata);
  const mountTimeRef = useRef<number>(Date.now());
  const activeTimersRef = useRef<Map<string, number>>(new Map());

  // Create contextual logger instance
  const contextualLogger = createContextualLogger(contextRef.current, logger);

  // Enhanced metadata with hook-specific info
  const getEnhancedMetadata = useCallback((additionalMetadata?: Record<string, any>) => {
    return {
      ...metadataRef.current,
      hookContext: contextRef.current,
      componentMountTime: mountTimeRef.current,
      timestamp: Date.now(),
      ...additionalMetadata
    };
  }, []);

  // Basic logging methods with enhanced metadata
  const debug = useCallback((message: string, metadata?: Record<string, any>) => {
    if (enableDebugMode) {
      contextualLogger.debug(message, getEnhancedMetadata(metadata));
    }
  }, [contextualLogger, getEnhancedMetadata, enableDebugMode]);

  const info = useCallback((message: string, metadata?: Record<string, any>) => {
    contextualLogger.info(message, getEnhancedMetadata(metadata));
  }, [contextualLogger, getEnhancedMetadata]);

  const warn = useCallback((message: string, metadata?: Record<string, any>) => {
    contextualLogger.warn(message, getEnhancedMetadata(metadata));
  }, [contextualLogger, getEnhancedMetadata]);

  const error = useCallback((message: string, error?: Error, metadata?: Record<string, any>) => {
    contextualLogger.error(message, getEnhancedMetadata(metadata), error);
  }, [contextualLogger, getEnhancedMetadata]);

  const critical = useCallback((message: string, error?: Error, metadata?: Record<string, any>) => {
    contextualLogger.critical(message, getEnhancedMetadata(metadata), error);
  }, [contextualLogger, getEnhancedMetadata]);

  // Performance tracking methods
  const startTimer = useCallback((label: string): PerformanceTimer => {
    const startTime = performance.now();
    const timerId = `${contextRef.current}_${label}_${startTime}`;
    
    activeTimersRef.current.set(timerId, startTime);

    if (enablePerformanceTracking) {
      debug(`Performance timer started: ${label}`, { performanceLabel: label, startTime });
    }

    return {
      end: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        activeTimersRef.current.delete(timerId);
        
        if (enablePerformanceTracking) {
          info(`Performance: ${label} completed`, {
            performanceLabel: label,
            duration: `${duration.toFixed(2)}ms`,
            startTime,
            endTime
          });
        }
      },
      label,
      startTime
    };
  }, [debug, info, enablePerformanceTracking]);

  const trackRender = useCallback((componentName: string) => {
    if (enablePerformanceTracking) {
      debug(`Component render: ${componentName}`, {
        event: 'render',
        componentName,
        renderTime: Date.now()
      });
    }
  }, [debug, enablePerformanceTracking]);

  const trackMount = useCallback((componentName: string) => {
    if (enablePerformanceTracking) {
      info(`Component mounted: ${componentName}`, {
        event: 'mount',
        componentName,
        mountTime: Date.now()
      });
    }
  }, [info, enablePerformanceTracking]);

  const trackUnmount = useCallback((componentName: string) => {
    const mountTime = mountTimeRef.current;
    const unmountTime = Date.now();
    const lifetime = unmountTime - mountTime;

    if (enablePerformanceTracking) {
      info(`Component unmounted: ${componentName}`, {
        event: 'unmount',
        componentName,
        unmountTime,
        componentLifetime: `${lifetime}ms`
      });
    }
  }, [info, enablePerformanceTracking]);

  // User interaction tracking
  const trackClick = useCallback((element: string, metadata?: Record<string, any>) => {
    info(`User click: ${element}`, {
      event: 'click',
      element,
      interactionTime: Date.now(),
      ...metadata
    });
  }, [info]);

  const trackNavigation = useCallback((route: string, metadata?: Record<string, any>) => {
    info(`Navigation: ${route}`, {
      event: 'navigation',
      route,
      previousRoute: window.location.pathname,
      navigationTime: Date.now(),
      ...metadata
    });
  }, [info]);

  const trackFormSubmit = useCallback((formName: string, success: boolean, metadata?: Record<string, any>) => {
    const message = `Form ${success ? 'submitted' : 'failed'}: ${formName}`;
    const logMethod = success ? info : warn;
    
    logMethod(message, {
      event: 'form_submit',
      formName,
      success,
      submitTime: Date.now(),
      ...metadata
    });
  }, [info, warn]);

  // API call tracking
  const trackApiCall = useCallback((endpoint: string, method: string, metadata?: Record<string, any>) => {
    const startTime = Date.now();
    
    debug(`API call started: ${method} ${endpoint}`, {
      event: 'api_call_start',
      endpoint,
      method,
      startTime,
      ...metadata
    });

    return {
      success: (responseTime: number, successMetadata?: Record<string, any>) => {
        info(`API call successful: ${method} ${endpoint}`, {
          event: 'api_call_success',
          endpoint,
          method,
          responseTime: `${responseTime}ms`,
          duration: responseTime,
          startTime,
          endTime: Date.now(),
          ...metadata,
          ...successMetadata
        });
      },
      error: (apiError: Error, responseTime: number, errorMetadata?: Record<string, any>) => {
        error(`API call failed: ${method} ${endpoint}`, apiError, {
          event: 'api_call_error',
          endpoint,
          method,
          responseTime: `${responseTime}ms`,
          duration: responseTime,
          startTime,
          endTime: Date.now(),
          ...metadata,
          ...errorMetadata
        });
      }
    };
  }, [debug, info, error]);

  // Hook lifecycle methods
  const setContext = useCallback((newContext: string) => {
    const oldContext = contextRef.current;
    contextRef.current = newContext;
    
    debug(`Context changed from ${oldContext} to ${newContext}`, {
      event: 'context_change',
      oldContext,
      newContext
    });
  }, [debug]);

  const addMetadata = useCallback((key: string, value: string | number | boolean | null) => {
    metadataRef.current[key] = value;
    
    if (enableDebugMode) {
      debug(`Metadata added: ${key}`, {
        event: 'metadata_add',
        metadataKey: key,
        metadataValue: value
      });
    }
  }, [debug, enableDebugMode]);

  const removeMetadata = useCallback((key: string) => {
    delete metadataRef.current[key];
    
    if (enableDebugMode) {
      debug(`Metadata removed: ${key}`, {
        event: 'metadata_remove',
        metadataKey: key
      });
    }
  }, [debug, enableDebugMode]);

  // Component lifecycle tracking - OTTIMIZZATO per evitare re-render
  useEffect(() => {
    let mounted = true;
    
    if (enablePerformanceTracking && mounted) {
      info(`useLogger hook mounted`, {
        event: 'hook_mount',
        context: contextRef.current,
        options: { enablePerformanceTracking, enableDebugMode }
      });
    }

    return () => {
      mounted = false;
      // Clean up active timers
      activeTimersRef.current.clear();
      
      if (enablePerformanceTracking) {
        info(`useLogger hook unmounted`, {
          event: 'hook_unmount',
          context: contextRef.current
        });
      }
    };
  }, []); // Rimuove dipendenze per evitare re-mount continui

  // Auto-track context changes
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  return {
    // Basic logging
    debug,
    info,
    warn,
    error,
    critical,
    
    // Performance tracking
    startTimer,
    trackRender,
    trackMount,
    trackUnmount,
    
    // User interaction tracking
    trackClick,
    trackNavigation,
    trackFormSubmit,
    
    // API tracking
    trackApiCall,
    
    // Hook lifecycle
    setContext,
    addMetadata,
    removeMetadata,
    
    // Direct logger access
    logger
  };
};

// Specialized hooks for common use cases
export const useComponentLogger = (componentName: string) => {
  return useLogger({
    context: `Component-${componentName}`,
    enablePerformanceTracking: true,
    enableDebugMode: import.meta.env.DEV
  });
};

export const usePageLogger = (pageName: string) => {
  return useLogger({
    context: `Page-${pageName}`,
    enablePerformanceTracking: true,
    metadata: {
      pageType: 'page',
      pageName
    }
  });
};

export const useApiLogger = (apiContext: string) => {
  return useLogger({
    context: `API-${apiContext}`,
    enablePerformanceTracking: true,
    metadata: {
      loggerType: 'api',
      apiContext
    }
  });
};

export default useLogger;
