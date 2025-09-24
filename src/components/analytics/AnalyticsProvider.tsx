import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface AnalyticsContextType {
  trackEvent: (eventName: string, properties?: Record<string, any>) => void;
  trackPageView: (path: string, title?: string) => void;
  identifyUser: (userId: string, traits?: Record<string, any>) => void;
  trackConversion: (conversionType: string, value?: number, currency?: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

interface AnalyticsProviderProps {
  children: ReactNode;
  enabledInDev?: boolean;
}

// Analytics configuration
const ANALYTICS_CONFIG = {
  plausible: {
    domain: 'workover.app',
    enabled: true
  },
  gtag: {
    measurementId: 'G-XXXXXXXXXX', // Replace with actual GA4 ID
    enabled: false // Enable when ready
  }
};

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, any> }) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ 
  children, 
  enabledInDev = false 
}) => {
  const location = useLocation();
  const isProduction = import.meta.env.PROD;
  const shouldTrack = isProduction || enabledInDev;

  // Track page views on route changes
  useEffect(() => {
    if (shouldTrack) {
      trackPageView(location.pathname, document.title);
    }
  }, [location, shouldTrack]);

  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (!shouldTrack) return;

    // Plausible Analytics
    if (ANALYTICS_CONFIG.plausible.enabled && window.plausible) {
      window.plausible(eventName, properties ? { props: properties } : {});
    }

    // Google Analytics 4
    if (ANALYTICS_CONFIG.gtag.enabled && window.gtag) {
      window.gtag('event', eventName, {
        ...properties,
        send_to: ANALYTICS_CONFIG.gtag.measurementId
      });
    }

    // Console log in development
    if (!isProduction) {
      console.log('📊 Analytics Event:', eventName, properties);
    }
  };

  const trackPageView = (path: string, title?: string) => {
    if (!shouldTrack) return;

    // Plausible automatically tracks page views
    // But we can send custom page view events if needed

    // Google Analytics 4
    if (ANALYTICS_CONFIG.gtag.enabled && window.gtag) {
      window.gtag('config', ANALYTICS_CONFIG.gtag.measurementId, {
        page_path: path,
        page_title: title
      });
    }

    // Console log in development
    if (!isProduction) {
      console.log('📊 Page View:', path, title);
    }
  };

  const identifyUser = (userId: string, traits?: Record<string, any>) => {
    if (!shouldTrack) return;

    // Google Analytics 4 User ID
    if (ANALYTICS_CONFIG.gtag.enabled && window.gtag) {
      window.gtag('config', ANALYTICS_CONFIG.gtag.measurementId, {
        user_id: userId,
        custom_map: traits
      });
    }

    // Track user identification event
    trackEvent('user_identified', { user_id: userId, ...traits });
  };

  const trackConversion = (conversionType: string, value?: number, currency = 'EUR') => {
    if (!shouldTrack) return;

    const conversionData = {
      conversion_type: conversionType,
      value,
      currency
    };

    // Track as regular event
    trackEvent('conversion', conversionData);

    // Google Analytics Enhanced Ecommerce
    if (ANALYTICS_CONFIG.gtag.enabled && window.gtag && value) {
      window.gtag('event', 'purchase', {
        transaction_id: `${conversionType}_${Date.now()}`,
        value,
        currency,
        items: [{
          item_id: conversionType,
          item_name: conversionType,
          category: 'conversion',
          quantity: 1,
          price: value
        }]
      });
    }
  };

  const contextValue: AnalyticsContextType = {
    trackEvent,
    trackPageView,
    identifyUser,
    trackConversion
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

// Pre-defined tracking functions for common events
export const trackingEvents = {
  // User actions
  userSignUp: (method: string) => ({ event: 'user_sign_up', method }),
  userLogin: (method: string) => ({ event: 'user_login', method }),
  userLogout: () => ({ event: 'user_logout' }),
  
  // Space interactions
  spaceView: (spaceId: string, spaceTitle: string) => ({ 
    event: 'space_view', 
    space_id: spaceId, 
    space_title: spaceTitle 
  }),
  spaceSearch: (query: string, location?: string) => ({ 
    event: 'space_search', 
    search_term: query, 
    location 
  }),
  spaceFavorite: (spaceId: string, action: 'add' | 'remove') => ({ 
    event: 'space_favorite', 
    space_id: spaceId, 
    action 
  }),
  
  // Booking flow
  bookingStart: (spaceId: string) => ({ event: 'booking_start', space_id: spaceId }),
  bookingComplete: (spaceId: string, amount: number) => ({ 
    event: 'booking_complete', 
    space_id: spaceId, 
    value: amount 
  }),
  bookingCancel: (bookingId: string, reason?: string) => ({ 
    event: 'booking_cancel', 
    booking_id: bookingId, 
    reason 
  }),
  
  // Networking
  connectionRequest: (targetUserId: string) => ({ 
    event: 'connection_request', 
    target_user_id: targetUserId 
  }),
  connectionAccept: (senderUserId: string) => ({ 
    event: 'connection_accept', 
    sender_user_id: senderUserId 
  }),
  messagesSent: (recipientId: string) => ({ 
    event: 'message_sent', 
    recipient_id: recipientId 
  }),
  
  // Reviews
  reviewSubmit: (targetType: string, rating: number) => ({ 
    event: 'review_submit', 
    target_type: targetType, 
    rating 
  }),
  
  // Host actions
  spaceCreate: (spaceType: string) => ({ event: 'space_create', space_type: spaceType }),
  spaceEdit: (spaceId: string) => ({ event: 'space_edit', space_id: spaceId }),
  bookingApprove: (bookingId: string) => ({ event: 'booking_approve', booking_id: bookingId }),
  
  // Engagement
  profileComplete: (completionRate: number) => ({ 
    event: 'profile_complete', 
    completion_rate: completionRate 
  }),
  newsletterSubscribe: () => ({ event: 'newsletter_subscribe' }),
  supportContact: (issue_type: string) => ({ event: 'support_contact', issue_type })
};

export default AnalyticsProvider;