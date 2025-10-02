import * as React from 'react';
import { sreLogger } from '@/lib/sre-logger';

interface PerformanceMetrics {
  renderCount: number;
  avgRenderTime: number;
  maxRenderTime: number;
  memoryUsage: number;
  lastRenderTime: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: Map<string, MutationObserver> = new Map();

  /**
   * Track component render performance
   */
  trackRender(componentName: string, renderTime: number) {
    const existing = this.metrics.get(componentName) || {
      renderCount: 0,
      avgRenderTime: 0,
      maxRenderTime: 0,
      memoryUsage: 0,
      lastRenderTime: 0
    };

    existing.renderCount++;
    existing.avgRenderTime = (existing.avgRenderTime * (existing.renderCount - 1) + renderTime) / existing.renderCount;
    existing.maxRenderTime = Math.max(existing.maxRenderTime, renderTime);
    existing.lastRenderTime = renderTime;
    
    // Get memory usage if available
    if ('memory' in performance) {
      existing.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    this.metrics.set(componentName, existing);

    // Alert on performance issues
    this.checkPerformanceThresholds(componentName, existing);
  }

  /**
   * Detect excessive re-renders
   */
  private checkPerformanceThresholds(componentName: string, metrics: PerformanceMetrics) {
    const RENDER_TIME_THRESHOLD = 16; // 16ms for 60fps
    const RENDER_COUNT_THRESHOLD = 50; // More than 50 renders in a session
    
    if (metrics.avgRenderTime > RENDER_TIME_THRESHOLD) {
      sreLogger.warn('Performance: Slow average render time', { 
        componentName, 
        avgRenderTime: metrics.avgRenderTime.toFixed(2),
        threshold: RENDER_TIME_THRESHOLD 
      });
    }

    if (metrics.renderCount > RENDER_COUNT_THRESHOLD) {
      sreLogger.warn('Performance: Excessive render count', { 
        componentName, 
        renderCount: metrics.renderCount,
        threshold: RENDER_COUNT_THRESHOLD 
      });
    }
  }

  /**
   * Monitor DOM mutations for excessive changes
   */
  startDOMMonitoring(containerId: string = 'root') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let mutationCount = 0;
    const resetInterval = 5000; // Reset every 5 seconds

    const observer = new MutationObserver((mutations) => {
      mutationCount += mutations.length;
      
      // Check for excessive mutations
      if (mutationCount > 100) {
        sreLogger.warn('Performance: Excessive DOM mutations', { 
          mutationCount, 
          resetInterval,
          containerId 
        });
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Reset counter periodically
    setInterval(() => {
      mutationCount = 0;
    }, resetInterval);

    this.observers.set(containerId, observer);
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): Record<string, PerformanceMetrics> {
    const report: Record<string, PerformanceMetrics> = {};
    
    this.metrics.forEach((metrics, componentName) => {
      report[componentName] = { ...metrics };
    });

    return report;
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics.clear();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook to track component render performance
 */
export const useRenderTracking = (componentName: string) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      performanceMonitor.trackRender(componentName, renderTime);
    };
  });
};

/**
 * HOC to automatically track render performance
 */
export const withRenderTracking = <T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName?: string
) => {
  const TrackedComponent = (props: T) => {
    const name = componentName || Component.displayName || Component.name || 'UnknownComponent';
    useRenderTracking(name);
    
    return React.createElement(Component, props);
  };

  TrackedComponent.displayName = `withRenderTracking(${Component.displayName || Component.name})`;
  
  return TrackedComponent;
};