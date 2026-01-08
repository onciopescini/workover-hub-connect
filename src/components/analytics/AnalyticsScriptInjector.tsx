import React, { useEffect, useRef } from 'react';
import { sreLogger } from '@/lib/sre-logger';
import { API_ENDPOINTS, SUPABASE_URL } from '@/constants';

/**
 * AnalyticsScriptInjector
 *
 * Dynamically injects the Plausible Analytics script to prevent it from blocking
 * the main application render. Handles errors gracefully.
 */
export const AnalyticsScriptInjector: React.FC = () => {
  const injectedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate injection in strict mode or re-renders
    if (injectedRef.current) return;

    // Check if already in DOM
    if (document.querySelector('script[data-domain="preview--workover-hub-connect.lovable.app"]')) {
      injectedRef.current = true;
      return;
    }

    try {
      const script = document.createElement('script');
      script.defer = true;
      script.setAttribute('data-domain', 'preview--workover-hub-connect.lovable.app');

      // Construct URL dynamically using constants
      // Remove trailing slash from SUPABASE_URL if present to avoid double slashes
      const baseUrl = SUPABASE_URL.replace(/\/$/, '');
      const analyticsUrl = `${baseUrl}/functions/v1/${API_ENDPOINTS.ANALYTICS_PROXY}`;

      script.setAttribute('data-api', analyticsUrl);
      script.src = 'https://plausible.io/js/script.js';

      script.onerror = (e) => {
        // Log but do not crash
        sreLogger.warn('Analytics script failed to load', {}, e as Error);
      };

      document.head.appendChild(script);
      injectedRef.current = true;
    } catch (error) {
      // Log but do not crash
      sreLogger.warn('Failed to inject analytics script', {}, error as Error);
    }
  }, []);

  return null;
};
