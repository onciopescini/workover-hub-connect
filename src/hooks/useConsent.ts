
import { useState, useEffect, useCallback } from 'react';
import type { CookieConsent, ConsentSettings, ConsentAction } from '@/types/gdpr';
import { createContextualLogger } from '@/lib/logger';

const consentLogger = createContextualLogger('ConsentManagement');

const CONSENT_VERSION = '1.0.0';
const STORAGE_KEY = 'workover_consent';

const DEFAULT_CONSENT: CookieConsent = {
  necessary: true, // Always true, required for app functionality
  analytics: false,
  marketing: false,
  preferences: false,
  timestamp: Date.now(),
  version: CONSENT_VERSION
};

const DEFAULT_SETTINGS: ConsentSettings = {
  bannerDismissed: false,
  consent: DEFAULT_CONSENT,
  lastUpdated: Date.now()
};

export const useConsent = () => {
  const [settings, setSettings] = useState<ConsentSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load consent from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ConsentSettings;
        
        // Check if consent version is outdated
        if (parsed.consent.version !== CONSENT_VERSION) {
          consentLogger.info('Consent version outdated, resetting', {
            action: 'consent_version_reset',
            oldVersion: parsed.consent.version,
            newVersion: CONSENT_VERSION
          });
          setSettings(DEFAULT_SETTINGS);
        } else {
          setSettings(parsed);
          consentLogger.info('Consent loaded from storage', {
            action: 'consent_loaded',
            bannerDismissed: parsed.bannerDismissed,
            consentGiven: Object.entries(parsed.consent).filter(([key, value]) => 
              key !== 'timestamp' && key !== 'version' && value === true
            ).map(([key]) => key)
          });
        }
      }
    } catch (error) {
      consentLogger.error('Error loading consent from storage', error instanceof Error ? error : new Error('Unknown error'), {
        action: 'consent_load_error'
      });
      setSettings(DEFAULT_SETTINGS);
    }
    setIsLoaded(true);
  }, []);

  // Save consent to localStorage
  const saveConsent = useCallback((newSettings: ConsentSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      
      consentLogger.info('Consent saved', {
        action: 'consent_saved',
        bannerDismissed: newSettings.bannerDismissed,
        consentGiven: Object.entries(newSettings.consent).filter(([key, value]) => 
          key !== 'timestamp' && key !== 'version' && value === true
        ).map(([key]) => key)
      });
    } catch (error) {
      consentLogger.error('Error saving consent', error instanceof Error ? error : new Error('Unknown error'), {
        action: 'consent_save_error'
      });
    }
  }, []);

  // Handle consent actions
  const handleConsent = useCallback((action: ConsentAction, customConsent?: Partial<CookieConsent>) => {
    const timestamp = Date.now();
    let newConsent: CookieConsent;

    switch (action) {
      case 'accept-all':
        newConsent = {
          necessary: true,
          analytics: true,
          marketing: true,
          preferences: true,
          timestamp,
          version: CONSENT_VERSION
        };
        break;
      
      case 'reject-all':
        newConsent = {
          necessary: true, // Always required
          analytics: false,
          marketing: false,
          preferences: false,
          timestamp,
          version: CONSENT_VERSION
        };
        break;
      
      case 'customize':
      case 'save-preferences':
        newConsent = {
          necessary: true, // Always required
          analytics: customConsent?.analytics ?? false,
          marketing: customConsent?.marketing ?? false,
          preferences: customConsent?.preferences ?? false,
          timestamp,
          version: CONSENT_VERSION
        };
        break;
      
      default:
        consentLogger.warn('Unknown consent action', {
          action: 'unknown_consent_action',
          providedAction: action
        });
        return;
    }

    const newSettings: ConsentSettings = {
      bannerDismissed: true,
      consent: newConsent,
      lastUpdated: timestamp
    };

    saveConsent(newSettings);

    consentLogger.info('Consent action processed', {
      action: 'consent_action_processed',
      consentAction: action,
      finalConsent: Object.entries(newConsent).filter(([key, value]) => 
        key !== 'timestamp' && key !== 'version' && value === true
      ).map(([key]) => key)
    });
  }, [saveConsent]);

  // Check if specific consent is given
  const hasConsent = useCallback((category: keyof Omit<CookieConsent, 'timestamp' | 'version'>) => {
    return settings.consent[category];
  }, [settings.consent]);

  // Check if banner should be shown
  const shouldShowBanner = !settings.bannerDismissed && isLoaded;

  // Reset consent (for testing or privacy policy updates)
  const resetConsent = useCallback(() => {
    const resetSettings = {
      ...DEFAULT_SETTINGS,
      lastUpdated: Date.now()
    };
    saveConsent(resetSettings);
    
    consentLogger.info('Consent reset', {
      action: 'consent_reset'
    });
  }, [saveConsent]);

  return {
    settings,
    isLoaded,
    shouldShowBanner,
    hasConsent,
    handleConsent,
    resetConsent,
    consent: settings.consent
  };
};
