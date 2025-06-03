
export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  timestamp: number;
  version: string;
}

export interface ConsentSettings {
  bannerDismissed: boolean;
  consent: CookieConsent;
  lastUpdated: number;
}

export type ConsentAction = 'accept-all' | 'reject-all' | 'customize' | 'save-preferences';

export interface CookieCategory {
  id: keyof Omit<CookieConsent, 'timestamp' | 'version'>;
  name: string;
  description: string;
  required: boolean;
  cookies: string[];
}
