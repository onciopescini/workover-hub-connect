
import type { CookieCategory } from '@/types/gdpr';

export const COOKIE_CATEGORIES: CookieCategory[] = [
  {
    id: 'necessary',
    name: 'Cookie Necessari',
    description: 'Questi cookie sono essenziali per il funzionamento del sito web e non possono essere disabilitati.',
    required: true,
    cookies: ['workover_consent', 'supabase.auth.token', 'session_id']
  },
  {
    id: 'analytics',
    name: 'Cookie Analitici',
    description: 'Ci aiutano a capire come gli utenti interagiscono con il sito web raccogliendo informazioni in forma anonima.',
    required: false,
    cookies: ['_ga', '_gid', '_gat', 'analytics_session']
  },
  {
    id: 'marketing',
    name: 'Cookie di Marketing',
    description: 'Utilizzati per tracciare i visitatori sui siti web per mostrare annunci pertinenti e coinvolgenti.',
    required: false,
    cookies: ['_fbp', '_fbc', 'linkedin_insights', 'marketing_id']
  },
  {
    id: 'preferences',
    name: 'Cookie delle Preferenze',
    description: 'Permettono al sito web di ricordare informazioni che cambiano il comportamento o l\'aspetto del sito.',
    required: false,
    cookies: ['theme_preference', 'language_preference', 'notification_settings']
  }
];

// Block non-essential cookies if consent not given
export const blockCookiesWithoutConsent = (hasConsent: (category: string) => boolean) => {
  // Block analytics cookies
  if (!hasConsent('analytics')) {
    // Disable Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied'
      });
    }
  }

  // Block marketing cookies
  if (!hasConsent('marketing')) {
    // Remove marketing-related cookies
    const marketingCookies = COOKIE_CATEGORIES.find(cat => cat.id === 'marketing')?.cookies || [];
    marketingCookies.forEach(cookieName => {
      if (typeof document !== 'undefined') {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
      }
    });
  }
};

// Apply consent settings to third-party services
export const applyConsentSettings = (hasConsent: (category: string) => boolean) => {
  // Google Analytics consent
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', {
      'analytics_storage': hasConsent('analytics') ? 'granted' : 'denied',
      'ad_storage': hasConsent('marketing') ? 'granted' : 'denied',
      'functionality_storage': hasConsent('preferences') ? 'granted' : 'denied',
      'personalization_storage': hasConsent('preferences') ? 'granted' : 'denied'
    });
  }

  // Facebook Pixel consent
  if (typeof window !== 'undefined' && window.fbq && !hasConsent('marketing')) {
    // Disable Facebook Pixel if marketing consent not given
    window.fbq('consent', 'revoke');
  }
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}
