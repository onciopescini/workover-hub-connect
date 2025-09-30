/**
 * SRE Metrics Collection Hook
 * 
 * Tracks key application metrics:
 * 1. API Request Latency (P95)
 * 2. Error Rate & Booking Success Rate
 * 3. Active User Sessions
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { logMetric, startTimer } from '@/lib/sre-logger';

interface APIMetrics {
  requestCount: number;
  errorCount: number;
  successRate: number;
  avgLatency: number;
  p95Latency: number;
}

interface BookingMetrics {
  totalAttempts: number;
  successfulBookings: number;
  failedBookings: number;
  successRate: number;
}

interface SessionMetrics {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  pageViews: number;
  userActions: number;
}

export const useMetricsCollection = () => {
  const [apiMetrics, setApiMetrics] = useState<APIMetrics>({
    requestCount: 0,
    errorCount: 0,
    successRate: 100,
    avgLatency: 0,
    p95Latency: 0
  });

  const [bookingMetrics, setBookingMetrics] = useState<BookingMetrics>({
    totalAttempts: 0,
    successfulBookings: 0,
    failedBookings: 0,
    successRate: 100
  });

  const sessionMetrics = useRef<SessionMetrics>({
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    lastActivity: Date.now(),
    pageViews: 0,
    userActions: 0
  });

  const latencyHistory = useRef<number[]>([]);
  const maxLatencyHistorySize = 100;

  /**
   * Track API request with latency measurement
   */
  const trackAPIRequest = useCallback(async <T,>(
    apiName: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    const endTimer = startTimer(`api_${apiName}`, {
      sessionId: sessionMetrics.current.sessionId,
      apiName
    });

    const startTime = performance.now();

    try {
      const result = await requestFn();
      const latency = performance.now() - startTime;

      // Update latency history
      latencyHistory.current.push(latency);
      if (latencyHistory.current.length > maxLatencyHistorySize) {
        latencyHistory.current.shift();
      }

      // Calculate P95 latency
      const sortedLatencies = [...latencyHistory.current].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedLatencies.length * 0.95);
      const p95 = sortedLatencies[p95Index] || 0;

      // Calculate average
      const avgLatency = latencyHistory.current.reduce((sum, l) => sum + l, 0) / latencyHistory.current.length;

      setApiMetrics(prev => ({
        requestCount: prev.requestCount + 1,
        errorCount: prev.errorCount,
        successRate: ((prev.requestCount + 1 - prev.errorCount) / (prev.requestCount + 1)) * 100,
        avgLatency: Math.round(avgLatency),
        p95Latency: Math.round(p95)
      }));

      logMetric('api_request_success', 1, 'count', { apiName });
      logMetric('api_latency', latency, 'ms', { apiName, status: 'success' });

      endTimer();
      return result;
    } catch (error) {
      const latency = performance.now() - startTime;

      setApiMetrics(prev => ({
        requestCount: prev.requestCount + 1,
        errorCount: prev.errorCount + 1,
        successRate: ((prev.requestCount + 1 - prev.errorCount - 1) / (prev.requestCount + 1)) * 100,
        avgLatency: prev.avgLatency,
        p95Latency: prev.p95Latency
      }));

      logMetric('api_request_error', 1, 'count', { apiName });
      logMetric('api_latency', latency, 'ms', { apiName, status: 'error' });

      endTimer();
      throw error;
    }
  }, []);

  /**
   * Track booking attempt
   */
  const trackBookingAttempt = useCallback((success: boolean, metadata?: Record<string, any>) => {
    setBookingMetrics(prev => {
      const newTotal = prev.totalAttempts + 1;
      const newSuccessful = success ? prev.successfulBookings + 1 : prev.successfulBookings;
      const newFailed = success ? prev.failedBookings : prev.failedBookings + 1;

      return {
        totalAttempts: newTotal,
        successfulBookings: newSuccessful,
        failedBookings: newFailed,
        successRate: (newSuccessful / newTotal) * 100
      };
    });

    logMetric(
      success ? 'booking_success' : 'booking_failure',
      1,
      'count',
      {
        sessionId: sessionMetrics.current.sessionId,
        ...metadata
      }
    );
  }, []);

  /**
   * Track user action (click, form submit, etc.)
   */
  const trackUserAction = useCallback((actionName: string, metadata?: Record<string, any>) => {
    sessionMetrics.current.userActions += 1;
    sessionMetrics.current.lastActivity = Date.now();

    logMetric('user_action', 1, 'count', {
      sessionId: sessionMetrics.current.sessionId,
      action: actionName,
      ...metadata
    });
  }, []);

  /**
   * Track page view
   */
  const trackPageView = useCallback((pagePath: string) => {
    sessionMetrics.current.pageViews += 1;
    sessionMetrics.current.lastActivity = Date.now();

    logMetric('page_view', 1, 'count', {
      sessionId: sessionMetrics.current.sessionId,
      path: pagePath
    });
  }, []);

  /**
   * Get current session duration
   */
  const getSessionDuration = useCallback(() => {
    return Date.now() - sessionMetrics.current.startTime;
  }, []);

  /**
   * Report metrics periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const sessionDuration = getSessionDuration();

      logMetric('session_duration', sessionDuration, 'ms', {
        sessionId: sessionMetrics.current.sessionId
      });

      logMetric('active_session', 1, 'count', {
        sessionId: sessionMetrics.current.sessionId,
        pageViews: sessionMetrics.current.pageViews.toString(),
        userActions: sessionMetrics.current.userActions.toString()
      });

      // Log aggregated metrics
      logMetric('api_success_rate', apiMetrics.successRate, 'percentage', {
        totalRequests: apiMetrics.requestCount.toString()
      });

      logMetric('booking_success_rate', bookingMetrics.successRate, 'percentage', {
        totalAttempts: bookingMetrics.totalAttempts.toString()
      });
    }, 60000); // Report every minute

    return () => clearInterval(interval);
  }, [apiMetrics, bookingMetrics, getSessionDuration]);

  /**
   * Track session end on unmount
   */
  useEffect(() => {
    return () => {
      const finalDuration = Date.now() - sessionMetrics.current.startTime;
      
      logMetric('session_end', finalDuration, 'ms', {
        sessionId: sessionMetrics.current.sessionId,
        pageViews: sessionMetrics.current.pageViews.toString(),
        userActions: sessionMetrics.current.userActions.toString()
      });
    };
  }, []);

  return {
    // Metrics
    apiMetrics,
    bookingMetrics,
    sessionMetrics: sessionMetrics.current,

    // Tracking functions
    trackAPIRequest,
    trackBookingAttempt,
    trackUserAction,
    trackPageView,
    getSessionDuration
  };
};

/**
 * Hook to track render performance of a component
 */
export const useRenderTracking = (componentName: string) => {
  const renderCount = useRef(0);
  const firstRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;

    if (renderCount.current === 1) {
      const renderTime = performance.now() - firstRenderTime.current;
      logMetric('component_first_render', renderTime, 'ms', {
        component: componentName
      });
    }

    logMetric('component_render', 1, 'count', {
      component: componentName,
      renderCount: renderCount.current.toString()
    });
  });

  return renderCount.current;
};
