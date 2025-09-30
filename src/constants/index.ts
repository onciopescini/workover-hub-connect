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
} as const;

// ============================================================================
// API ENDPOINTS & EXTERNAL URLs
// ============================================================================

export const API_ENDPOINTS = {
  /** Stripe dashboard URL */
  STRIPE_DASHBOARD: 'https://dashboard.stripe.com',
  
  /** Unsplash image base URL */
  UNSPLASH_BASE: 'https://images.unsplash.com',
  
  /** Mapbox API base URL */
  MAPBOX_API: 'https://api.mapbox.com',
} as const;

export const SOCIAL_MEDIA = {
  FACEBOOK: 'https://facebook.com',
  TWITTER: 'https://twitter.com',
  LINKEDIN: 'https://linkedin.com',
  INSTAGRAM: 'https://instagram.com',
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
