/**
 * Analytics tracking hook - GDPR compliant
 * 
 * Provides unified interface for tracking events across different analytics platforms
 * while respecting user consent preferences.
 * 
 * @example
 * ```tsx
 * const { trackEvent, pageview, identify } = useAnalytics();
 * 
 * // Track custom events
 * trackEvent('space_booked', { space_id: 'abc123', price: 50 });
 * 
 * // Track page views
 * pageview('/spaces');
 * 
 * // Identify user (only with consent)
 * identify('user123', { plan: 'pro' });
 * ```
 */
import { useCallback, useEffect } from 'react';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/react';
import { useConsent } from '@/hooks/useConsent';
import { sreLogger } from '@/lib/sre-logger';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

interface UserProperties {
  userId?: string;
  properties?: Record<string, any>;
}

/**
 * Custom hook for analytics tracking with GDPR compliance
 * 
 * @returns Analytics tracking functions
 */
export const useAnalytics = () => {
  const { consent } = useConsent();

  /**
   * Track custom events
   * 
   * @param eventName - Name of the event to track
   * @param properties - Optional event properties
   */
  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    // Only track if user has given analytics consent
    if (!consent?.analytics) {
      return;
    }

    try {
      // PostHog tracking
      if (import.meta.env.PROD && typeof window !== 'undefined') {
        posthog.capture(eventName, properties);
      }

      // Plausible tracking for custom events
      if (typeof window !== 'undefined' && 'plausible' in window) {
        (window as any).plausible(eventName, { props: properties });
      }
    } catch (error) {
      Sentry.captureException(error);
      sreLogger.warn('Analytics tracking failed', {}, error as Error);
    }
  }, [consent?.analytics]);

  /**
   * Track page views
   * 
   * @param page - Page path to track
   * @param properties - Optional page properties
   */
  const pageview = useCallback((page: string, properties?: Record<string, any>) => {
    if (!consent?.analytics) {
      return;
    }

    try {
      // PostHog pageview
      if (import.meta.env.PROD && typeof window !== 'undefined') {
        posthog.capture('$pageview', { 
          $current_url: window.location.href,
          page,
          ...properties 
        });
      }

      // Plausible pageview
      if (typeof window !== 'undefined' && 'plausible' in window) {
        (window as any).plausible('pageview', { u: page });
      }
    } catch (error) {
      Sentry.captureException(error);
      sreLogger.warn('Pageview tracking failed', {}, error as Error);
    }
  }, [consent?.analytics]);

  /**
   * Identify user for analytics
   * 
   * @param userId - User identifier
   * @param properties - User properties
   */
  const identify = useCallback((userId: string, properties?: Record<string, any>) => {
    if (!consent?.analytics) {
      return;
    }

    try {
      // PostHog identify
      if (import.meta.env.PROD && typeof window !== 'undefined') {
        posthog.identify(userId, properties);
      }

      // Sentry user context
      Sentry.setUser({
        id: userId,
        ...properties
      });
    } catch (error) {
      Sentry.captureException(error);
      sreLogger.warn('User identification failed', {}, error as Error);
    }
  }, [consent?.analytics]);

  /**
   * Reset analytics data (for logout)
   */
  const reset = useCallback(() => {
    try {
      // PostHog reset
      if (import.meta.env.PROD && typeof window !== 'undefined') {
        posthog.reset();
      }

      // Sentry reset user
      Sentry.setUser(null);
    } catch (error) {
      Sentry.captureException(error);
      sreLogger.warn('Analytics reset failed', {}, error as Error);
    }
  }, []);

  // Auto-track page changes
  useEffect(() => {
    if (consent?.analytics && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      pageview(currentPath);
    }
  }, [consent?.analytics, pageview]);

  return {
    trackEvent,
    pageview,
    identify,
    reset,
    isTrackingEnabled: consent?.analytics || false
  };
};

export default useAnalytics;