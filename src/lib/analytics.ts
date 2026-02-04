/**
 * Google Analytics 4 Integration
 * 
 * Provides unified analytics tracking with safe initialization.
 * Will not crash the app if GA_ID is missing.
 */

import { sreLogger } from '@/lib/sre-logger';

// Track if we've already logged the missing ID warning
let hasLoggedMissingId = false;
let isInitialized = false;

// GA4 Measurement ID from environment
const GA_MEASUREMENT_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

// Extend window type for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Initialize Google Analytics 4
 * 
 * Injects the gtag.js script and configures GA4.
 * Safe to call multiple times - only initializes once.
 */
export function initializeGA4(): void {
  // Prevent double initialization
  if (isInitialized) return;

  // Check for measurement ID
  if (!GA_MEASUREMENT_ID) {
    if (!hasLoggedMissingId) {
      sreLogger.info('GA ID missing - Analytics disabled');
      hasLoggedMissingId = true;
    }
    return;
  }

  // Only initialize in production
  if (!import.meta.env.PROD) {
    sreLogger.info('GA4 disabled in development mode');
    return;
  }

  try {
    // Create dataLayer if not exists
    window.dataLayer = window.dataLayer || [];

    // Define gtag function
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

    // Initialize with timestamp
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false, // We'll track page views manually for SPA
    });

    // Inject the gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    
    script.onerror = () => {
      sreLogger.warn('Failed to load Google Analytics script');
    };

    document.head.appendChild(script);
    isInitialized = true;

    sreLogger.info('GA4 initialized', { measurementId: GA_MEASUREMENT_ID });
  } catch (error) {
    sreLogger.warn('GA4 initialization failed', {}, error as Error);
  }
}

/**
 * Track a page view
 * 
 * @param path - The page path to track
 * @param title - Optional page title
 */
export function trackPageView(path: string, title?: string): void {
  if (!isInitialized || !window.gtag) return;

  try {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
      page_location: window.location.href,
    });
  } catch (error) {
    // Silently fail - analytics should never break the app
  }
}

/**
 * Track a custom event
 * 
 * @param eventName - The event name (e.g., 'booking_complete')
 * @param properties - Optional event properties
 */
export function trackEvent(
  eventName: string, 
  properties?: Record<string, string | number | boolean | undefined>
): void {
  if (!isInitialized || !window.gtag) return;

  try {
    window.gtag('event', eventName, properties);
  } catch (error) {
    // Silently fail
  }
}

/**
 * Identify a user (set user ID)
 * 
 * @param userId - The user's unique ID
 * @param traits - Optional user traits
 */
export function identifyUser(
  userId: string, 
  traits?: Record<string, string | number | boolean>
): void {
  if (!isInitialized || !window.gtag || !GA_MEASUREMENT_ID) return;

  try {
    window.gtag('config', GA_MEASUREMENT_ID, {
      user_id: userId,
      ...traits,
    });
  } catch (error) {
    // Silently fail
  }
}

/**
 * Track an e-commerce conversion
 * 
 * @param conversionType - Type of conversion (e.g., 'booking')
 * @param value - Monetary value
 * @param currency - Currency code (default: EUR)
 */
export function trackConversion(
  conversionType: string,
  value?: number,
  currency = 'EUR'
): void {
  if (!isInitialized || !window.gtag) return;

  try {
    window.gtag('event', 'purchase', {
      transaction_id: `${conversionType}_${Date.now()}`,
      value,
      currency,
      items: [
        {
          item_id: conversionType,
          item_name: conversionType,
          category: 'conversion',
          quantity: 1,
          price: value,
        },
      ],
    });
  } catch (error) {
    // Silently fail
  }
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return isInitialized;
}

/**
 * Pre-defined tracking events for common actions
 */
export const GA4Events = {
  // User actions
  userSignUp: (method: string) => trackEvent('sign_up', { method }),
  userLogin: (method: string) => trackEvent('login', { method }),
  userLogout: () => trackEvent('logout'),

  // Space interactions
  spaceView: (spaceId: string, spaceTitle: string) =>
    trackEvent('view_item', { item_id: spaceId, item_name: spaceTitle }),
  spaceSearch: (query: string, location?: string) =>
    trackEvent('search', { search_term: query, location }),
  spaceFavorite: (spaceId: string, action: 'add' | 'remove') =>
    trackEvent('add_to_wishlist', { item_id: spaceId, action }),

  // Booking flow
  bookingStart: (spaceId: string) =>
    trackEvent('begin_checkout', { item_id: spaceId }),
  bookingComplete: (spaceId: string, amount: number) =>
    trackConversion('booking', amount),
  bookingCancel: (bookingId: string, reason?: string) =>
    trackEvent('refund', { transaction_id: bookingId, reason }),

  // Networking
  connectionRequest: (targetUserId: string) =>
    trackEvent('generate_lead', { target_user_id: targetUserId }),
  messageSent: (recipientId: string) =>
    trackEvent('contact', { recipient_id: recipientId }),

  // Reviews
  reviewSubmit: (targetType: string, rating: number) =>
    trackEvent('rate', { content_type: targetType, rating }),

  // Host actions
  spaceCreate: (spaceType: string) =>
    trackEvent('add_listing', { item_category: spaceType }),
  spaceEdit: (spaceId: string) =>
    trackEvent('edit_listing', { item_id: spaceId }),
} as const;
