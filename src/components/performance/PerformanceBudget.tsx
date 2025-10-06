import { useEffect } from 'react';
import { sreLogger } from '@/lib/sre-logger';

interface PerformanceBudget {
  // Core Web Vitals targets
  lcp: number; // Largest Contentful Paint (ms)
  fid: number; // First Input Delay (ms)
  cls: number; // Cumulative Layout Shift (score)
  fcp: number; // First Contentful Paint (ms)
  ttfb: number; // Time to First Byte (ms)
}

interface PerformanceThresholds {
  good: number;
  warn: number;
  error: number;
}

const PERFORMANCE_BUDGET: PerformanceBudget = {
  lcp: 3000,    // Increased for complex hero section
  fid: 100,     // Target: < 100ms
  cls: 0.15,    // Increased for animated sections
  fcp: 2000,    // Slightly increased
  ttfb: 800,    // Target: < 800ms
};

// Progressive thresholds for better monitoring
const CLS_THRESHOLDS: PerformanceThresholds = {
  good: 0.1,
  warn: 0.15,
  error: 0.25,
};

const LCP_THRESHOLDS: PerformanceThresholds = {
  good: 2500,
  warn: 3000,
  error: 4000,
};

/**
 * Componente per monitorare e loggare violazioni del performance budget
 */
export function PerformanceBudget() {
  useEffect(() => {
    // Monitora LCP
    if (!('PerformanceObserver' in window)) {
      return;
    }
    
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        if (lastEntry.renderTime || lastEntry.loadTime) {
          const lcp = lastEntry.renderTime || lastEntry.loadTime;
          const level = lcp > LCP_THRESHOLDS.error ? 'error' : lcp > LCP_THRESHOLDS.warn ? 'warn' : 'good';
          
          if (level !== 'good') {
            sreLogger.warn('Performance budget exceeded', {
              metric: 'LCP',
              value: lcp,
              budget: PERFORMANCE_BUDGET.lcp,
              level,
              thresholds: LCP_THRESHOLDS,
              element: lastEntry.element?.tagName,
              url: window.location.href,
              userAgent: navigator.userAgent,
            });
          }
        }
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Monitora FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime;
          
          if (fid > PERFORMANCE_BUDGET.fid) {
            sreLogger.warn('Performance budget exceeded', {
              metric: 'FID',
              value: fid,
              budget: PERFORMANCE_BUDGET.fid,
            });
          }
        });
      });

      fidObserver.observe({ entryTypes: ['first-input'] });

      // Monitora CLS
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });

        const level = clsValue > CLS_THRESHOLDS.error ? 'error' : clsValue > CLS_THRESHOLDS.warn ? 'warn' : 'good';
        
        if (level !== 'good') {
          sreLogger.warn('Performance budget exceeded', {
            metric: 'CLS',
            value: clsValue,
            budget: PERFORMANCE_BUDGET.cls,
            level,
            thresholds: CLS_THRESHOLDS,
            url: window.location.href,
            userAgent: navigator.userAgent,
          });
        }
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Monitora Navigation Timing
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          if (perfData) {
            const fcp = perfData.responseStart - perfData.requestStart;
            const ttfb = perfData.responseStart - perfData.fetchStart;

            if (fcp > PERFORMANCE_BUDGET.fcp) {
              sreLogger.warn('Performance budget exceeded', {
                metric: 'FCP',
                value: fcp,
                budget: PERFORMANCE_BUDGET.fcp,
              });
            }

            if (ttfb > PERFORMANCE_BUDGET.ttfb) {
              sreLogger.warn('Performance budget exceeded', {
                metric: 'TTFB',
                value: ttfb,
                budget: PERFORMANCE_BUDGET.ttfb,
              });
            }
          }
        }, 0);
      });

      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    } catch (error) {
      sreLogger.error('Failed to initialize Performance Budget monitoring', { error });
      return undefined;
    }
  }, []);

  return null; // Questo componente non renderizza nulla
}
