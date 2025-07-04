/**
 * Production Monitoring Component
 * 
 * Provides development-only tools for monitoring application performance,
 * error tracking, and analytics in production builds.
 * 
 * Features:
 * - Performance metrics monitoring
 * - Error boundary integration
 * - Analytics consent management
 * - Development debugging tools
 * 
 * @example
 * ```tsx
 * // Add to App.tsx for global monitoring
 * <ProductionMonitoring>
 *   <YourApp />
 * </ProductionMonitoring>
 * ```
 */
import React, { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { frontendLogger } from '@/utils/frontend-logger';

interface ProductionMonitoringProps {
  children: React.ReactNode;
  enableDevTools?: boolean;
}

interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
}

/**
 * Production monitoring wrapper component
 * 
 * @param children - Child components to monitor
 * @param enableDevTools - Enable development debugging tools
 */
export const ProductionMonitoring: React.FC<ProductionMonitoringProps> = ({ 
  children, 
  enableDevTools = import.meta.env.DEV 
}) => {
  const { trackEvent } = useAnalytics();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  /**
   * Collect Core Web Vitals and performance metrics
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const measurePerformance = () => {
      try {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const performanceMetrics: PerformanceMetrics = {
            loadTime: navigation.loadEventEnd - navigation.fetchStart,
            firstContentfulPaint: 0,
            timeToInteractive: navigation.domInteractive - navigation.fetchStart
          };

          // Get First Contentful Paint
          const paintEntries = performance.getEntriesByType('paint');
          const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
          
          if (fcpEntry) {
            performanceMetrics.firstContentfulPaint = fcpEntry.startTime;
          }

          setMetrics(performanceMetrics);

          // Track performance metrics
          trackEvent('performance_metrics', {
            load_time: performanceMetrics.loadTime,
            fcp: performanceMetrics.firstContentfulPaint,
            tti: performanceMetrics.timeToInteractive,
            user_agent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`
          });

          // Send to Sentry for performance monitoring
          Sentry.addBreadcrumb({
            category: 'performance',
            message: 'Page performance metrics collected',
            data: performanceMetrics,
            level: 'info'
          });
        }
      } catch (error) {
        Sentry.captureException(error);
        frontendLogger.componentLoad('Performance monitoring failed', undefined, { 
          component: 'ProductionMonitoring'
        });
      }
    };

    // Wait for page to fully load
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
      return () => window.removeEventListener('load', measurePerformance);
    }
    
    return undefined;
  }, [trackEvent]);

  /**
   * Monitor unhandled promise rejections
   */
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      Sentry.captureException(event.reason);
      trackEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [trackEvent]);

  /**
   * Monitor network errors and connectivity
   */
  useEffect(() => {
    const handleOnline = () => {
      trackEvent('connectivity_restored');
      Sentry.addBreadcrumb({
        category: 'connectivity',
        message: 'Network connectivity restored',
        level: 'info'
      });
    };

    const handleOffline = () => {
      trackEvent('connectivity_lost');
      Sentry.addBreadcrumb({
        category: 'connectivity',
        message: 'Network connectivity lost',
        level: 'warning'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [trackEvent]);

  // Development monitoring panel
  if (enableDevTools && import.meta.env.DEV) {
    return (
      <>
        {children}
        <div 
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 9999,
            maxWidth: '300px'
          }}
        >
          <div><strong>🔧 Dev Monitoring</strong></div>
          {metrics && (
            <>
              <div>Load: {Math.round(metrics.loadTime)}ms</div>
              <div>FCP: {Math.round(metrics.firstContentfulPaint)}ms</div>
              <div>TTI: {Math.round(metrics.timeToInteractive)}ms</div>
            </>
          )}
          <div>Mode: {import.meta.env.MODE}</div>
          <div>Online: {navigator.onLine ? '✅' : '❌'}</div>
        </div>
      </>
    );
  }

  return <>{children}</>;
};

export default ProductionMonitoring;