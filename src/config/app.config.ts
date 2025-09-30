/**
 * Centralized Application Configuration
 * 
 * All environment variables and configuration values should be accessed through this file.
 * This ensures type safety and centralized management of all app settings.
 */

import { sreLogger } from '@/lib/sre-logger';

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
    serviceFeePct: number;
    defaultVatPct: number;
  };
  analytics: {
    plausibleDomain: string;
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

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key];
  if (!value && !defaultValue) {
    sreLogger.warn(`Missing environment variable`, { key });
  }
  return value || defaultValue || '';
};

const getBooleanEnv = (key: string, defaultValue = false): boolean => {
  const value = import.meta.env[key];
  return value === 'true' || value === '1' || defaultValue;
};

const getNumberEnv = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key];
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const appConfig: AppConfig = {
  api: {
    supabaseUrl: 'https://khtqwzvrxzsgfhsslwyz.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk',
  },
  features: {
    twoStepBooking: getBooleanEnv('VITE_BOOKING_TWO_STEP', true),
    stripeTax: getBooleanEnv('VITE_ENABLE_STRIPE_TAX', false),
    networking: getBooleanEnv('VITE_ENABLE_NETWORKING', true),
  },
  pricing: {
    serviceFeePct: getNumberEnv('VITE_SERVICE_FEE_PCT', 0.12),
    defaultVatPct: getNumberEnv('VITE_DEFAULT_VAT_PCT', 0.22),
  },
  analytics: {
    plausibleDomain: getEnvVar('VITE_PLAUSIBLE_DOMAIN', 'workover.app'),
    sentryDsn: getEnvVar('VITE_SENTRY_DSN'),
    posthogKey: getEnvVar('VITE_POSTHOG_KEY'),
  },
  external: {
    mapboxToken: getEnvVar('VITE_MAPBOX_ACCESS_TOKEN'),
    stripePublishableKey: getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY'),
  },
  performance: {
    cacheTimeout: getNumberEnv('VITE_CACHE_TIMEOUT', 300000), // 5 minutes
    retryAttempts: getNumberEnv('VITE_RETRY_ATTEMPTS', 3),
    logBufferSize: getNumberEnv('VITE_LOG_BUFFER_SIZE', 50),
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
