import React, { useEffect } from 'react';
import { useAnalytics } from '../analytics/AnalyticsProvider';

interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay  
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

declare global {
  interface Window {
    webVitals?: {
      getLCP: (callback: (metric: any) => void) => void;
      getFID: (callback: (metric: any) => void) => void;
      getCLS: (callback: (metric: any) => void) => void;
      getFCP: (callback: (metric: any) => void) => void;
      getTTFB: (callback: (metric: any) => void) => void;
    };
  }
}

export const PerformanceMonitor: React.FC = () => {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    // Load web-vitals library dynamically
    const loadWebVitals = async () => {
      try {
        const webVitals = await import('web-vitals');
        
        // Track Core Web Vitals
        webVitals.onLCP((metric: any) => {
          trackEvent('web_vital_lcp', {
            value: Math.round(metric.value),
            rating: metric.rating,
            page: window.location.pathname
          });
        });

        webVitals.onFID((metric: any) => {
          trackEvent('web_vital_fid', {
            value: Math.round(metric.value),
            rating: metric.rating,
            page: window.location.pathname
          });
        });

        webVitals.onCLS((metric: any) => {
          trackEvent('web_vital_cls', {
            value: Math.round(metric.value * 1000) / 1000,
            rating: metric.rating,
            page: window.location.pathname
          });
        });

        webVitals.onFCP((metric: any) => {
          trackEvent('web_vital_fcp', {
            value: Math.round(metric.value),
            rating: metric.rating,
            page: window.location.pathname
          });
        });

        webVitals.onTTFB((metric: any) => {
          trackEvent('web_vital_ttfb', {
            value: Math.round(metric.value),
            rating: metric.rating,
            page: window.location.pathname
          });
        });

      } catch (error) {
        console.warn('Failed to load web-vitals:', error);
      }
    };

    // Only load in production
    if (import.meta.env.PROD) {
      loadWebVitals();
    }

    // Track custom performance metrics
    trackCustomMetrics();
    
    // Monitor resource loading
    monitorResourceLoading();

    // Track JavaScript errors
    trackJavaScriptErrors();

  }, [trackEvent]);

  const trackCustomMetrics = () => {
    // Track page load time
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        trackEvent('page_load_time', {
          value: Math.round(navigation.loadEventEnd - navigation.fetchStart),
          page: window.location.pathname,
          connection: (navigator as any).connection?.effectiveType || 'unknown'
        });

        // Track time to interactive
        const tti = navigation.domInteractive - navigation.fetchStart;
        trackEvent('time_to_interactive', {
          value: Math.round(tti),
          page: window.location.pathname
        });
      }
    });

    // Track route changes (for SPA)
    const trackRouteChange = () => {
      const startTime = performance.now();
      
      return () => {
        const duration = performance.now() - startTime;
        trackEvent('route_change_time', {
          value: Math.round(duration),
          from: document.referrer || 'direct',
          to: window.location.pathname
        });
      };
    };

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              trackEvent('long_task', {
                duration: Math.round(entry.duration),
                page: window.location.pathname
              });
            }
          }
        });
        
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }
  };

  const monitorResourceLoading = () => {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const resource = entry as PerformanceResourceTiming;
            
            // Track slow resources
            if (resource.duration > 1000) { // Resources taking more than 1s
              trackEvent('slow_resource', {
                url: resource.name,
                duration: Math.round(resource.duration),
                type: resource.initiatorType,
                size: resource.transferSize || 0
              });
            }

            // Track failed resources
            if (resource.transferSize === 0 && resource.duration > 0) {
              trackEvent('failed_resource', {
                url: resource.name,
                type: resource.initiatorType
              });
            }
          }
        });
        
        observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  };

  const trackJavaScriptErrors = () => {
    // Global error handler
    window.addEventListener('error', (event) => {
      trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        page: window.location.pathname,
        stack: event.error?.stack?.substring(0, 500) // Limit stack trace length
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      trackEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString() || 'Unknown reason',
        page: window.location.pathname
      });
    });
  };

  return null; // This component doesn't render anything
};

// Performance budget checker
export const checkPerformanceBudget = (metrics: PerformanceMetrics) => {
  const budgets = {
    lcp: 2500, // 2.5s
    fid: 100,  // 100ms
    cls: 0.1,  // 0.1
    fcp: 1800, // 1.8s
    ttfb: 800  // 800ms
  };

  const violations: string[] = [];

  Object.entries(budgets).forEach(([metric, budget]) => {
    const value = metrics[metric as keyof PerformanceMetrics];
    if (value && value > budget) {
      violations.push(`${metric.toUpperCase()}: ${value} > ${budget}`);
    }
  });

  return {
    passed: violations.length === 0,
    violations
  };
};

// Hook for component-level performance tracking
export const usePerformanceTracker = (componentName: string) => {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      if (duration > 16) { // Only track if longer than 1 frame (16ms)
        trackEvent('component_render_time', {
          component: componentName,
          duration: Math.round(duration)
        });
      }
    };
  }, [componentName, trackEvent]);

  const trackUserAction = (action: string, data?: Record<string, any>) => {
    trackEvent(`${componentName}_${action}`, {
      component: componentName,
      ...data
    });
  };

  return { trackUserAction };
};

export default PerformanceMonitor;