import React, { useEffect } from 'react';
import { sreLogger } from '@/lib/sre-logger';

/**
 * AnalyticsScriptInjector
 *
 * Dynamically injects the Plausible Analytics script to prevent it from blocking
 * the main application render. Handles errors gracefully.
 */
export const AnalyticsScriptInjector: React.FC = () => {
  useEffect(() => {
    // Prevent duplicate injection
    if (document.querySelector('script[data-domain="preview--workover-hub-connect.lovable.app"]')) {
      return;
    }

    try {
      const script = document.createElement('script');
      script.defer = true;
      script.setAttribute('data-domain', 'preview--workover-hub-connect.lovable.app');
      script.setAttribute('data-api', 'https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/analytics-proxy');
      script.src = 'https://plausible.io/js/script.js';

      script.onerror = (e) => {
        // Log but do not crash
        sreLogger.warn('Analytics script failed to load', {}, e as Error);
      };

      document.head.appendChild(script);
    } catch (error) {
      // Log but do not crash
      sreLogger.warn('Failed to inject analytics script', {}, error as Error);
    }
  }, []);

  return null;
};
