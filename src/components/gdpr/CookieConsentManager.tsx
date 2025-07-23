
import React, { useEffect } from 'react';
import { useConsent } from '@/hooks/useConsent';
import { CookieConsentBanner } from './CookieConsentBanner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { frontendLogger } from '@/utils/frontend-logger';

export function CookieConsentManager() {
  const { consent, shouldShowBanner } = useConsent();
  const { authState } = useAuth();

  // Log consent choices to database when they change
  useEffect(() => {
    if (!shouldShowBanner && consent.timestamp) {
      logConsentToDatabase();
    }
  }, [consent, shouldShowBanner, authState.user?.id]);

  const logConsentToDatabase = async () => {
    try {
      // Only collect user agent if analytics consent is given
      const userAgent = consent.analytics ? navigator.userAgent : '';
      
      await supabase
        .from('cookie_consent_log')
        .insert({
          user_id: authState.user?.id || null,
          session_id: authState.user?.id ? null : generateSessionId(),
          consent_version: consent.version,
          necessary_consent: consent.necessary,
          analytics_consent: consent.analytics,
          marketing_consent: consent.marketing,
          preferences_consent: consent.preferences,
          consent_method: 'banner',
          user_agent: userAgent,
          consent_given_at: new Date(consent.timestamp).toISOString(),
          is_active: true
        });
    } catch (error) {
      frontendLogger.adminAction('Error logging consent', error, { 
        component: 'CookieConsentManager' 
      });
    }
  };

  const generateSessionId = () => {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  };

  return <CookieConsentBanner />;
}
