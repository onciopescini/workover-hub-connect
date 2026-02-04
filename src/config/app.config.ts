/**
 * Centralized Application Configuration
 * 
 * All environment variables and configuration values should be accessed through this file.
 * This ensures type safety and centralized management of all app settings.
 */

import { sreLogger } from '@/lib/sre-logger';
import { supabase } from '@/integrations/supabase/client';
import { PricingEngine } from '@/lib/pricing-engine';

interface AppConfig {
  api: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
  features: {
    twoStepBooking: boolean;
    stripeTax: boolean;
    networking: boolean;
  };
  pricing: {
    // Deprecated: Access PricingEngine directly for calculations
    // These remain for backward compatibility with monitoring/logging if needed
    serviceFeePct: number;
    defaultVatPct: number;
  };
  analytics: {
    ga4MeasurementId?: string;
    sentryDsn?: string;
    posthogKey?: string;
  };
  external: {
    mapboxToken?: string;
    stripePublishableKey?: string;
  };
  performance: {
    cacheTimeout: number;
    retryAttempts: number;
    logBufferSize: number;
  };
}

/**
 * Get environment variable with optional default
 * NOTE: VITE_* variables are deprecated - use direct values instead
 */
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key];
  if (!value && !defaultValue) {
    sreLogger.warn(`Missing environment variable`, { key });
  }
  return value || defaultValue || '';
};

/**
 * DEPRECATED: Feature flags should be controlled via database or admin panel
 * These are temporary defaults only
 */
const getBooleanEnv = (key: string, defaultValue = false): boolean => {
  const value = import.meta.env[key];
  return value === 'true' || value === '1' || defaultValue;
};

const getNumberEnv = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key];
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Centralized Application Configuration
 * 
 * IMPORTANT: Supabase credentials are imported from auto-generated client file.
 * This prevents duplication and follows Lovable's single source of truth pattern.
 */
export const appConfig: AppConfig = {
  api: {
    // Import from auto-generated Supabase client (single source of truth)
    supabaseUrl: (supabase as any).supabaseUrl,
    supabaseAnonKey: (supabase as any).supabaseKey,
  },
  features: {
    // Default feature flags - should be moved to database in future
    twoStepBooking: true,
    stripeTax: false,
    networking: true,
  },
  pricing: {
    // Using constants from PricingEngine to maintain compatibility
    serviceFeePct: PricingEngine.GUEST_FEE_PERCENT,
    defaultVatPct: PricingEngine.VAT_RATE,
  },
  analytics: {
    ga4MeasurementId: getEnvVar('VITE_GOOGLE_ANALYTICS_ID'),
    sentryDsn: getEnvVar('VITE_SENTRY_DSN'),
    posthogKey: getEnvVar('VITE_POSTHOG_KEY'),
  },
  external: {
    mapboxToken: getEnvVar('VITE_MAPBOX_ACCESS_TOKEN'),
    stripePublishableKey: getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY'),
  },
  performance: {
    cacheTimeout: 300000, // 5 minutes (use TIME_CONSTANTS.CACHE_DURATION)
    retryAttempts: 3, // use BUSINESS_RULES.RETRY_ATTEMPTS
    logBufferSize: 50,
  },
};

/**
 * Validates required configuration at app startup
 * Throws error if critical config is missing
 */
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Critical validations
  if (!appConfig.api.supabaseUrl) {
    errors.push('SUPABASE_URL is required');
  }
  if (!appConfig.api.supabaseAnonKey) {
    errors.push('SUPABASE_ANON_KEY is required');
  }

  // URL format validations
  if (appConfig.api.supabaseUrl && !appConfig.api.supabaseUrl.startsWith('https://')) {
    errors.push('SUPABASE_URL must be a valid HTTPS URL');
  }

  // Range validations
  if (appConfig.pricing.serviceFeePct < 0 || appConfig.pricing.serviceFeePct > 1) {
    errors.push('SERVICE_FEE_PCT must be between 0 and 1');
  }
  if (appConfig.pricing.defaultVatPct < 0 || appConfig.pricing.defaultVatPct > 1) {
    errors.push('DEFAULT_VAT_PCT must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Run validation on module load in development
if (import.meta.env.DEV) {
  const validation = validateConfig();
  if (!validation.valid) {
    sreLogger.error('Configuration validation failed', { errors: validation.errors });
  } else {
    sreLogger.info('Configuration validated successfully');
  }
}
