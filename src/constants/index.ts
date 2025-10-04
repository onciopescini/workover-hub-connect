/**
 * Application Constants
 * 
 * Centralized location for all magic numbers, URLs, and business rules.
 * These values should never be hardcoded in components.
 */

// ============================================================================
// TIME CONSTANTS
// ============================================================================

export const TIME_CONSTANTS = {
  /** Cache duration in milliseconds (5 minutes) */
  CACHE_DURATION: 5 * 60 * 1000,
  
  /** Minimum buffer time before booking in minutes */
  BOOKING_BUFFER_MINUTES: 0,
  
  /** Default time slot interval in minutes */
  DEFAULT_SLOT_INTERVAL: 30,
  
  /** Working hours range */
  WORKING_HOURS: {
    START: 8,
    END: 20,
  },
  
  /** Session timeout in milliseconds (30 minutes) */
  SESSION_TIMEOUT: 30 * 60 * 1000,
  
  /** Debounce delay for search inputs in milliseconds */
  SEARCH_DEBOUNCE: 300,
  
  /** Auto-refresh interval for dashboards in milliseconds (5 minutes) */
  AUTO_REFRESH_INTERVAL: 5 * 60 * 1000,
  
  /** Polling interval for real-time updates in milliseconds (30 seconds) */
  POLLING_INTERVAL: 30 * 1000,
  
  /** Notification display duration in milliseconds (5 seconds) */
  NOTIFICATION_DURATION: 5000,
  
  /** Retry delay for failed operations in milliseconds (1 second) */
  RETRY_DELAY: 1000,
  
  /** Animation duration for UI transitions in milliseconds */
  ANIMATION_DURATION: 300,
  
  /** Idle timeout before showing warning in milliseconds (25 minutes) */
  IDLE_WARNING_TIMEOUT: 25 * 60 * 1000,
  
  /** Time before stale data refresh in milliseconds (10 minutes) */
  STALE_TIME: 10 * 60 * 1000,
  
  /** Rate limit window in milliseconds (1 minute) */
  RATE_LIMIT_WINDOW: 60 * 1000,
  
  /** Calendar event refresh interval in milliseconds (2 minutes) */
  CALENDAR_REFRESH: 2 * 60 * 1000,
  
  /** Metric aggregation interval in milliseconds (15 seconds) */
  METRIC_INTERVAL: 15 * 1000,
} as const;

// ============================================================================
// BUSINESS RULES
// ============================================================================

export const BUSINESS_RULES = {
  /** Minimum booking duration in hours */
  MIN_BOOKING_DURATION: 0.5,
  
  /** Default maximum guests per space */
  MAX_GUESTS_DEFAULT: 10,
  
  /** Maximum number of retry attempts for failed operations */
  RETRY_ATTEMPTS: 3,
  
  /** Service fee percentage (12%) */
  SERVICE_FEE_PCT: 0.12,
  
  /** Default VAT percentage (22%) */
  DEFAULT_VAT_PCT: 0.22,
  
  /** Maximum file size for uploads in bytes (5MB) */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  /** Maximum number of photos per space */
  MAX_PHOTOS_PER_SPACE: 10,
  
  /** Minimum price per day in euros */
  MIN_PRICE_PER_DAY: 10,
  
  /** Maximum price per day in euros */
  MAX_PRICE_PER_DAY: 10000,
  
  /** Review visibility delay in days */
  REVIEW_VISIBILITY_DELAY: 14,
  
  /** DAC7 reporting thresholds */
  DAC7_THRESHOLD: {
    INCOME: 2000, // €2000
    TRANSACTIONS: 25,
  },
  
  /** Cancellation fee tiers based on days before booking */
  CANCELLATION_FEES: {
    /** 0-24 hours before: 90% fee */
    TIER_1_DAYS: 1,
    TIER_1_FEE_PCT: 0.90,
    
    /** 1-7 days before: 50% fee */
    TIER_2_DAYS: 7,
    TIER_2_FEE_PCT: 0.50,
    
    /** 7-14 days before: 25% fee */
    TIER_3_DAYS: 14,
    TIER_3_FEE_PCT: 0.25,
    
    /** 14+ days before: 0% fee */
    TIER_4_FEE_PCT: 0.00,
  },
  
  /** Minimum characters for text fields */
  MIN_DESCRIPTION_LENGTH: 50,
  MIN_TITLE_LENGTH: 5,
  
  /** Maximum characters for text fields */
  MAX_TITLE_LENGTH: 100,
  MAX_BIO_LENGTH: 500,
  
  /** Pagination defaults */
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  /** Rate limiting */
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_LOGIN_ATTEMPTS: 5,
  
  /** Threshold for triggering reports */
  REPORT_THRESHOLD: 3,
  
  /** Session management */
  MAX_CONCURRENT_SESSIONS: 5,
  
  /** Platform commission after service fee */
  PLATFORM_COMMISSION_PCT: 0.05,
} as const;

// ============================================================================
// API ENDPOINTS & EXTERNAL URLs
// ============================================================================

export const API_ENDPOINTS = {
  /** Stripe dashboard URL */
  STRIPE_DASHBOARD: 'https://dashboard.stripe.com',
  
  /** Stripe payment links */
  STRIPE_PAYMENT_LINKS: 'https://buy.stripe.com',
  
  /** Unsplash image base URL */
  UNSPLASH_BASE: 'https://images.unsplash.com',
  
  /** Mapbox API base URL */
  MAPBOX_API: 'https://api.mapbox.com',
  
  /** Mapbox Geocoding API */
  MAPBOX_GEOCODING: 'https://api.mapbox.com/geocoding/v5',
  
  /** Mapbox Static Images API */
  MAPBOX_STATIC: 'https://api.mapbox.com/styles/v1',
  
  /** Google Maps (fallback) */
  GOOGLE_MAPS: 'https://www.google.com/maps',
  
  /** Plausible Analytics */
  PLAUSIBLE_SCRIPT: 'https://plausible.io/js/script.js',
  
  /** Sentry error tracking */
  SENTRY_CDN: 'https://browser.sentry-cdn.com',
} as const;

export const SOCIAL_MEDIA = {
  FACEBOOK: 'https://facebook.com',
  TWITTER: 'https://twitter.com',
  LINKEDIN: 'https://linkedin.com',
  INSTAGRAM: 'https://instagram.com',
  YOUTUBE: 'https://youtube.com',
  TIKTOK: 'https://tiktok.com',
} as const;

export const WORKOVER_URLS = {
  /** Main website */
  WEBSITE: 'https://workover.app',
  
  /** Support email */
  SUPPORT_EMAIL: 'support@workover.app',
  
  /** Legal pages */
  TERMS: '/terms',
  PRIVACY: '/privacy',
  COOKIES: '/cookies',
  
  /** Documentation */
  HELP_CENTER: '/help',
  FAQ: '/faq',
} as const;

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const UI_CONSTANTS = {
  /** Default items per page for pagination */
  ITEMS_PER_PAGE: 20,
  
  /** Maximum characters for text truncation */
  MAX_DESCRIPTION_LENGTH: 500,
  
  /** Toast notification duration in milliseconds */
  TOAST_DURATION: 3000,
  
  /** Modal animation duration in milliseconds */
  MODAL_ANIMATION_DURATION: 200,
  
  /** Skeleton loading delay in milliseconds */
  SKELETON_DELAY: 150,
  
  /** Map zoom levels */
  MAP_ZOOM: {
    DEFAULT: 12,
    DETAIL: 15,
    OVERVIEW: 10,
  },
} as const;

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION = {
  /** Minimum password length */
  PASSWORD_MIN_LENGTH: 8,
  
  /** Email regex pattern */
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  /** Phone number regex pattern (Italian format) */
  PHONE_PATTERN: /^(\+39)?[\s]?[0-9]{10}$/,
  
  /** VAT number regex pattern (Italian format) */
  VAT_PATTERN: /^IT[0-9]{11}$/,
  
  /** Postal code regex pattern (Italian format) */
  POSTAL_CODE_PATTERN: /^[0-9]{5}$/,
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURES = {
  /** Enable two-step booking flow */
  TWO_STEP_BOOKING: true,
  
  /** Enable Stripe tax calculation */
  STRIPE_TAX: false,
  
  /** Enable networking features */
  NETWORKING: true,
  
  /** Enable SRE dashboard for admins */
  SRE_DASHBOARD: true,
  
  /** Enable advanced analytics */
  ADVANCED_ANALYTICS: false,
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  GENERIC: 'Si è verificato un errore. Riprova più tardi.',
  NETWORK: 'Errore di connessione. Verifica la tua connessione internet.',
  UNAUTHORIZED: 'Non sei autorizzato a eseguire questa operazione.',
  NOT_FOUND: 'Risorsa non trovata.',
  VALIDATION: 'I dati inseriti non sono validi.',
  SESSION_EXPIRED: 'La tua sessione è scaduta. Effettua nuovamente il login.',
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
  BOOKING_CREATED: 'Prenotazione effettuata con successo!',
  PROFILE_UPDATED: 'Profilo aggiornato con successo!',
  SPACE_CREATED: 'Spazio creato con successo!',
  SPACE_UPDATED: 'Spazio aggiornato con successo!',
  PAYMENT_COMPLETED: 'Pagamento completato con successo!',
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/** Check if a value is a valid time constant key */
export const isValidTimeConstant = (key: string): key is keyof typeof TIME_CONSTANTS => {
  return key in TIME_CONSTANTS;
};

/** Check if a value is a valid business rule key */
export const isValidBusinessRule = (key: string): key is keyof typeof BUSINESS_RULES => {
  return key in BUSINESS_RULES;
};
