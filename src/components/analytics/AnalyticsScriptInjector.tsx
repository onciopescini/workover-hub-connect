/**
 * AnalyticsScriptInjector
 *
 * This component was previously used to inject Plausible Analytics.
 * GA4 is now initialized via src/lib/analytics.ts and AnalyticsProvider.
 * 
 * This file is kept for backward compatibility but renders nothing.
 * It can be safely removed in a future cleanup.
 */
import React from 'react';

export const AnalyticsScriptInjector: React.FC = () => {
  // GA4 initialization is now handled in AnalyticsProvider
  // This component is kept for backward compatibility only
  return null;
};
