import React, { createContext, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  initializeGA4, 
  trackPageView, 
  trackEvent as ga4TrackEvent, 
  identifyUser as ga4IdentifyUser,
  trackConversion as ga4TrackConversion 
} from '@/lib/analytics';

interface AnalyticsContextType {
  trackEvent: (eventName: string, properties?: Record<string, unknown>) => void;
  trackPageView: (path: string, title?: string) => void;
  identifyUser: (userId: string, traits?: Record<string, unknown>) => void;
  trackConversion: (conversionType: string, value?: number, currency?: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

interface AnalyticsProviderProps {
  children: ReactNode;
  enabledInDev?: boolean;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ 
  children, 
  enabledInDev = false 
}) => {
  const location = useLocation();
  const isProduction = import.meta.env.PROD;
  const shouldTrack = isProduction || enabledInDev;

  // Initialize GA4 on mount
  useEffect(() => {
    if (shouldTrack) {
      initializeGA4();
    }
  }, [shouldTrack]);

  // Track page views on route changes
  useEffect(() => {
    if (shouldTrack) {
      trackPageView(location.pathname, document.title);
    }
  }, [location.pathname, shouldTrack]);

  const handleTrackEvent = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    if (!shouldTrack) return;
    
    // Convert to GA4 compatible format
    const ga4Properties = properties as Record<string, string | number | boolean | undefined>;
    ga4TrackEvent(eventName, ga4Properties);
  }, [shouldTrack]);

  const handleTrackPageView = useCallback((path: string, title?: string) => {
    if (!shouldTrack) return;
    trackPageView(path, title);
  }, [shouldTrack]);

  const handleIdentifyUser = useCallback((userId: string, traits?: Record<string, unknown>) => {
    if (!shouldTrack) return;
    const ga4Traits = traits as Record<string, string | number | boolean>;
    ga4IdentifyUser(userId, ga4Traits);
  }, [shouldTrack]);

  const handleTrackConversion = useCallback((conversionType: string, value?: number, currency = 'EUR') => {
    if (!shouldTrack) return;
    ga4TrackConversion(conversionType, value, currency);
  }, [shouldTrack]);

  const contextValue: AnalyticsContextType = useMemo(() => ({
    trackEvent: handleTrackEvent,
    trackPageView: handleTrackPageView,
    identifyUser: handleIdentifyUser,
    trackConversion: handleTrackConversion
  }), [handleTrackEvent, handleTrackPageView, handleIdentifyUser, handleTrackConversion]);

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
  userSignUp: (method: string) => ({ event: 'sign_up', method }),
  userLogin: (method: string) => ({ event: 'login', method }),
  userLogout: () => ({ event: 'logout' }),
  
  // Space interactions
  spaceView: (spaceId: string, spaceTitle: string) => ({ 
    event: 'view_item', 
    item_id: spaceId, 
    item_name: spaceTitle 
  }),
  spaceSearch: (query: string, location?: string) => ({ 
    event: 'search', 
    search_term: query, 
    location 
  }),
  spaceFavorite: (spaceId: string, action: 'add' | 'remove') => ({ 
    event: 'add_to_wishlist', 
    item_id: spaceId, 
    action 
  }),
  
  // Booking flow
  bookingStart: (spaceId: string) => ({ event: 'begin_checkout', item_id: spaceId }),
  bookingComplete: (spaceId: string, amount: number) => ({ 
    event: 'purchase', 
    item_id: spaceId, 
    value: amount 
  }),
  bookingCancel: (bookingId: string, reason?: string) => ({ 
    event: 'refund', 
    transaction_id: bookingId, 
    reason 
  }),
  
  // Networking
  connectionRequest: (targetUserId: string) => ({ 
    event: 'generate_lead', 
    target_user_id: targetUserId 
  }),
  connectionAccept: (senderUserId: string) => ({ 
    event: 'generate_lead', 
    sender_user_id: senderUserId 
  }),
  messagesSent: (recipientId: string) => ({ 
    event: 'contact', 
    recipient_id: recipientId 
  }),
  
  // Reviews
  reviewSubmit: (targetType: string, rating: number) => ({ 
    event: 'rate', 
    content_type: targetType, 
    rating 
  }),
  
  // Host actions
  spaceCreate: (spaceType: string) => ({ event: 'add_listing', item_category: spaceType }),
  spaceEdit: (spaceId: string) => ({ event: 'edit_listing', item_id: spaceId }),
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
