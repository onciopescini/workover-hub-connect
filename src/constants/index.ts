import { PricingEngine } from '@/lib/pricing-engine';

export const APP_NAME = 'WorkOver';
export const APP_VERSION = '1.0.0';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const API_ENDPOINTS = {
  CREATE_CHECKOUT: 'create-checkout-v3',
  CANCEL_BOOKING: 'cancel-booking',
  STRIPE_CONNECT: 'stripe-connect',
  CREATE_STRIPE_CONNECT_ACCOUNT: 'create-stripe-connect-account',
  ANALYTICS_PROXY: 'analytics-proxy',
  UNSPLASH_BASE: 'https://images.unsplash.com',
  STRIPE_DASHBOARD: 'https://dashboard.stripe.com',
};

// Pricing constants - now derived from PricingEngine
export const PRICING = {
  SERVICE_FEE_PCT: PricingEngine.GUEST_FEE_PERCENT,
  PLATFORM_COMMISSION_PCT: PricingEngine.GUEST_FEE_PERCENT, // Alias for backward compatibility
  DEFAULT_VAT_PCT: PricingEngine.VAT_RATE,
};

export const BOOKING = {
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_HOURS: 24,
  SLOT_INTERVAL_MINUTES: 30,
};

export const UI = {
  DATE_FORMAT: 'dd/MM/yyyy',
  TIME_FORMAT: 'HH:mm',
  DATETIME_FORMAT: 'dd/MM/yyyy HH:mm',
};

export const TIME_CONSTANTS = {
  CACHE_DURATION: 300000, // 5 minutes in ms
  TOAST_DURATION: 5000,   // 5 seconds in ms
  DEBOUNCE_DELAY: 300,    // 300ms
};

export const BUSINESS_RULES = {
  RETRY_ATTEMPTS: 3,
  MAX_GUESTS_LIMIT: 50,
  AUTO_CANCEL_PENDING_HOURS: 24,
};
